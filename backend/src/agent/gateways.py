"""LLM gateway: the seam between the agent loop and any OpenAI-compatible provider.

Mirrors ``GooglePlacesGateway``/``GooglePlacesError``, but as a real ABC — the seam is
needed for ``FakeLlmGateway`` in tests, and the free-tier landscape guarantees a provider
swap eventually (model id, base URL and key are settings, not code).
"""

import json
from abc import ABC, abstractmethod

import requests

from src.config import settings
from src.utils.logger import logger


class LlmError(Exception):
    """The LLM provider could not be reached or answered with an error."""


class LlmGateway(ABC):

    @abstractmethod
    def complete(
        self,
        messages: list[dict],
        tools: list[dict] | None,
        reasoning_effort: str,
    ) -> dict:
        """Run one chat completion and return the assistant message (``choices[0].message``).

        ``reasoning_effort`` is a REQUIRED argument, not an optional kwarg: gpt-oss models
        default to "medium", which silently triples reasoning tokens against the TPM
        window — forgetting it must be impossible.
        """


class GroqLlmGateway(LlmGateway):
    """OpenAI-compatible chat completions against Groq.

    Never send: ``logprobs``, ``logit_bias``, ``top_logprobs``, ``messages[].name``,
    ``n != 1`` — each is a documented 400. Use ``max_completion_tokens`` (not
    ``max_tokens``) and never ``temperature: 0`` (silently rewritten to 1e-8).
    """

    def complete(
        self,
        messages: list[dict],
        tools: list[dict] | None,
        reasoning_effort: str,
    ) -> dict:
        body: dict = {
            "model": settings.llm_model,
            "messages": messages,
            "reasoning_effort": reasoning_effort,
            "include_reasoning": False,
            "temperature": 0.1,
            "max_completion_tokens": settings.llm_max_completion_tokens,
            "n": 1,
        }
        if tools:
            body["tools"] = tools
            body["tool_choice"] = "auto"
            body["parallel_tool_calls"] = False
        else:
            # Structurally prevents a runaway extra tool round-trip (§3 mitigation).
            body["tool_choice"] = "none"

        try:
            response = requests.post(
                f"{settings.llm_base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
                # requests has no default timeout; a hung socket on a single-worker
                # instance is a hung app.
                timeout=settings.llm_timeout_seconds,
            )
        except requests.RequestException as exp:
            logger.error(f"LLM request failed: {exp}")
            raise LlmError("Could not reach the assistant service.") from exp

        if not response.ok:
            logger.error(f"LLM error {response.status_code}: {response.text[:500]}")
            raise LlmError(f"The assistant service answered with an error ({response.status_code}).")

        data = response.json()
        usage = data.get("usage", {})
        logger.info(
            "LLM call: in={} out={} total={} remaining-tokens={}".format(
                usage.get("prompt_tokens"),
                usage.get("completion_tokens"),
                usage.get("total_tokens"),
                response.headers.get("x-ratelimit-remaining-tokens"),
            )
        )
        try:
            return data["choices"][0]["message"]
        except (KeyError, IndexError) as exp:
            logger.error(f"LLM response missing choices: {json.dumps(data)[:500]}")
            raise LlmError("The assistant service returned an unexpected response.") from exp
