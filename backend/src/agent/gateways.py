"""LLM gateway: the seam between the agent loop and any OpenAI-compatible provider.

Mirrors ``GooglePlacesGateway``/``GooglePlacesError``, but as a real ABC — the seam is
needed for ``FakeLlmGateway`` in tests, and the free-tier landscape guarantees a provider
swap eventually (model id, base URL and key are settings, not code).
"""

import json
import time
from abc import ABC, abstractmethod

import requests

from src.config import settings
from src.utils.logger import logger


class LlmError(Exception):
    """The LLM provider could not be reached or answered with an error."""


class LlmBudgetError(LlmError):
    """The request can NEVER fit the provider's per-minute token ceiling.

    Permanent and non-retryable: no amount of waiting makes a single request smaller
    than a per-minute limit, and the provider gives no marker distinguishing "wait"
    from "impossible" — this pre-send check is the discriminator (§3)."""


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

        # Pre-send estimate (no tokenizer dependency; //3 is accurate enough for a
        # ceiling check). Raised BEFORE any network traffic.
        estimate = (
            len(json.dumps(messages)) // 3
            + (len(json.dumps(tools)) // 3 if tools else 0)
            + settings.llm_max_completion_tokens
        )
        if estimate > settings.agent_tpm_ceiling:
            logger.warning(f"LLM request rejected pre-send: ~{estimate} tokens > {settings.agent_tpm_ceiling} TPM ceiling")
            raise LlmBudgetError("This conversation has grown too large for one request. Please start a new chat.")

        response = None
        for attempt in (1, 2):  # retry-after backoff, 2 attempts max (§3)
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
            if response.status_code != 429 or attempt == 2:
                break
            delay = min(float(response.headers.get("retry-after") or 2), 15.0)
            logger.warning(f"LLM 429, retrying once after {delay}s")
            time.sleep(delay)

        if response.status_code == 404:
            # A retired model id returns 404, not a graceful fallback (risk 4).
            logger.error(
                f"LLM 404 for model '{settings.llm_model}' — likely retired; "
                f"check /docs/deprecations and update LLM_MODEL. Body: {response.text[:300]}"
            )
            raise LlmError("The assistant model is unavailable — it may have been retired.")
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


class SttGateway(ABC):

    @abstractmethod
    def transcribe(self, audio: bytes, filename: str, content_type: str, language: str) -> str:
        """Transcribe one audio clip to text."""


class GroqSttGateway(SttGateway):
    """Whisper transcription on the same provider, key and ZDR posture as the chat."""

    def transcribe(self, audio: bytes, filename: str, content_type: str, language: str) -> str:
        try:
            response = requests.post(
                f"{settings.llm_base_url}/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.llm_api_key}"},
                files={"file": (filename, audio, content_type)},
                data={
                    "model": settings.stt_model,
                    "language": language,
                    "response_format": "json",
                    "temperature": 0,
                },
                timeout=settings.llm_timeout_seconds,
            )
        except requests.RequestException as exp:
            logger.error(f"STT request failed: {exp}")
            raise LlmError("Could not reach the transcription service.") from exp

        if not response.ok:
            logger.error(f"STT error {response.status_code}: {response.text[:500]}")
            raise LlmError(f"The transcription service answered with an error ({response.status_code}).")

        text = response.json().get("text", "")
        logger.info(f"STT call: {len(audio)} bytes -> {len(text)} chars")
        return text.strip()
