"""AgentService.chat — the hand-written tool loop.

Design rules this loop must never violate (§4 of the architecture doc):

- ``AgentService`` NEVER opens ``with uow:`` — a transaction spanning an LLM call is
  aborted by ``transactionLifetimeLimitSeconds`` from underneath us after all the work.
- The whole loop runs inside ONE ``asyncio.to_thread`` hop (the controller's), never
  per-tool hops: pymongo's ``ClientSession`` is not thread-safe across the shared
  ``session_provider``.
- The assistant message is appended to ``messages`` VERBATIM before dispatch —
  reconstructing it drifts ``tool_calls[].id`` and the next request 400s.
- EVERY requested call gets exactly one ``role: "tool"`` reply, including failed ones —
  a missing reply is a hard 400 on every OpenAI-compatible server.
"""

import json
from datetime import date

from pydantic import ValidationError

from src.agent.gateways import LlmGateway
from src.agent.models import ChatMessage
from src.agent.prompts import SYSTEM_PROMPT
from src.agent.registry import ToolRegistry
from src.config import settings
from src.unit_of_work import UnitOfWork
from src.utils.logger import logger
from src.utils.wrappers import service

# Tools are offered on the first iterations only; later iterations drop the tools array
# and send tool_choice "none", which both saves ~600 tokens per call against the TPM
# window and structurally forces a text answer (§3).
_LAST_TOOL_ITERATION = 3

_FALLBACK_TEXT = {
    "de": "Das konnte ich gerade nicht beantworten. Formuliere die Frage bitte einmal anders.",
    "en": "I could not finish answering that. Please try rephrasing the question.",
}


class AgentService:
    """Read-only conversational agent over the user's own data."""

    def __init__(self, uow: UnitOfWork, llm: LlmGateway):
        self._uow = uow
        self._llm = llm

    @service
    def chat(
        self,
        user_id: str,
        message: str,
        history: list[ChatMessage],
        language: str,
        restaurant_id: str | None = None,
    ) -> dict:
        """Run one agent turn. Returns ``{"blocks": [...], "proposals": []}``."""
        registry = ToolRegistry(self._uow, user_id)

        # Date and language ride in the user message, never the system prompt — the
        # system prompt is a cache-stable constant (§3).
        prefix = f"[language={language}] [today={date.today().isoformat()}]"
        if restaurant_id:
            prefix += f" [restaurant_id={restaurant_id}]"
        messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
        messages += [{"role": m.role, "content": m.content} for m in history]
        messages.append({"role": "user", "content": f"{prefix}\n{message}"})

        last_tool_iteration = min(_LAST_TOOL_ITERATION, settings.agent_max_iterations - 1)
        for iteration in range(1, settings.agent_max_iterations + 1):
            offer_tools = iteration <= last_tool_iteration
            assistant = self._llm.complete(
                messages,
                tools=registry.schemas() if offer_tools else None,
                reasoning_effort="low",
            )
            messages.append(assistant)

            calls = assistant.get("tool_calls") or []
            if not calls:
                return self._final_answer(assistant, language)
            for call in calls:
                result = self._invoke(registry, call)
                messages.append({
                    "role": "tool",
                    "tool_call_id": call["id"],
                    # ensure_ascii=False is not cosmetic: escaped umlauts cost ~3x tokens.
                    "content": json.dumps(result, ensure_ascii=False, default=str),
                })

        # The iteration cap fired: the model kept requesting tools past the point where
        # any were offered. Degrade to a clean reply instead of burning more quota.
        logger.warning(f"Agent hit the iteration cap ({settings.agent_max_iterations}) for user {user_id}")
        return {
            "blocks": [{"kind": "text", "text": _FALLBACK_TEXT.get(language, _FALLBACK_TEXT["en"])}],
            "proposals": [],
        }

    @staticmethod
    def _final_answer(assistant: dict, language: str) -> dict:
        text = (assistant.get("content") or "").strip()
        if not text:
            text = _FALLBACK_TEXT.get(language, _FALLBACK_TEXT["en"])
        return {"blocks": [{"kind": "text", "text": text}], "proposals": []}

    @staticmethod
    def _invoke(registry: ToolRegistry, call: dict) -> dict:
        """Run one tool call; ALL failures become data the model can read and retry from.

        Deliberately not decorated with ``@service`` (it re-raises in both branches,
        which would kill the turn and waste the tokens already spent). This is the only
        place in the agent with a bare ``except Exception``.
        """
        function = call.get("function", {})
        name = function.get("name", "")
        try:
            result = registry.dispatch(name, function.get("arguments") or "{}")
            return {"kind": "data", "data": result}
        except ValidationError as exc:
            # MUST come before ValueError (its superclass): the field-level details are
            # what lets the model self-correct.
            details = [
                {"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]}
                for e in exc.errors()
            ]
            return {"is_error": True, "error": "invalid_arguments", "details": details}
        except ValueError as exc:
            return {"is_error": True, "error": str(exc)}
        except Exception as exc:
            logger.error(f"Tool '{name}' failed unexpectedly: {exc}")
            return {"is_error": True, "error": f"{type(exc).__name__}: {exc}"}
