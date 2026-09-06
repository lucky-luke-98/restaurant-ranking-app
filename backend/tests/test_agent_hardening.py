"""Step-7 hardening: the pre-send token estimate and the retry-after backoff."""

import pytest

from src.agent.gateways import GroqLlmGateway, LlmBudgetError, LlmError


def test_oversized_request_is_rejected_before_any_network_call(monkeypatch):
    def explode(*args, **kwargs):  # any HTTP attempt fails the test
        raise AssertionError("pre-send estimate must reject before the network")

    monkeypatch.setattr("src.agent.gateways.requests.post", explode)
    huge_history = [{"role": "user", "content": "x" * 30_000}]

    with pytest.raises(LlmBudgetError):
        GroqLlmGateway().complete(huge_history, tools=None, reasoning_effort="low")


class _Response:
    def __init__(self, status_code, payload=None, headers=None):
        self.status_code = status_code
        self.ok = status_code < 400
        self.headers = headers or {}
        self.text = "rate limited" if status_code == 429 else ""
        self._payload = payload or {}

    def json(self):
        return self._payload


def test_429_is_retried_once_with_retry_after(monkeypatch):
    responses = [
        _Response(429, headers={"retry-after": "0.5"}),
        _Response(200, payload={
            "choices": [{"message": {"role": "assistant", "content": "ok"}}],
            "usage": {},
        }),
    ]
    sleeps: list[float] = []
    monkeypatch.setattr("src.agent.gateways.requests.post", lambda *a, **k: responses.pop(0))
    monkeypatch.setattr("src.agent.gateways.time.sleep", sleeps.append)

    message = GroqLlmGateway().complete(
        [{"role": "user", "content": "hi"}], tools=None, reasoning_effort="low"
    )
    assert message["content"] == "ok"
    assert sleeps == [0.5]
    assert responses == []  # exactly two attempts


def test_persistent_429_fails_after_two_attempts(monkeypatch):
    responses = [_Response(429, headers={}), _Response(429, headers={})]
    monkeypatch.setattr("src.agent.gateways.requests.post", lambda *a, **k: responses.pop(0))
    monkeypatch.setattr("src.agent.gateways.time.sleep", lambda s: None)

    with pytest.raises(LlmError):
        GroqLlmGateway().complete(
            [{"role": "user", "content": "hi"}], tools=None, reasoning_effort="low"
        )
    assert responses == []  # both consumed, no third attempt


def test_retired_model_404_is_a_clear_error(monkeypatch):
    monkeypatch.setattr("src.agent.gateways.requests.post", lambda *a, **k: _Response(404))
    with pytest.raises(LlmError, match="retired"):
        GroqLlmGateway().complete(
            [{"role": "user", "content": "hi"}], tools=None, reasoning_effort="low"
        )
