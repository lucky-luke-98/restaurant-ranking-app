"""Agent tests — the security controls from docs/agent-architecture.md §9, adapted to
the read-only v1 tool surface, plus the loop's failure semantics."""

import json

import pytest
from pydantic import ValidationError

from src.agent.gateways import LlmGateway
from src.agent.registry import ToolRegistry
from src.dependencies import get_llm_gateway
from src.main import app
from tests.conftest import TEST_USER
from tests.fakes import FakeUnitOfWork

UID = TEST_USER["user_id"]


class FakeLlmGateway(LlmGateway):
    """Scripted gateway. Records every call; raises if called more often than scripted,
    so a broken stop condition fails the test instead of hanging it."""

    def __init__(self, script: list[dict]):
        self._script = list(script)
        self.calls: list[dict] = []

    def complete(self, messages, tools, reasoning_effort):
        assert reasoning_effort == "low", "reasoning_effort must always be 'low'"
        if not self._script:
            raise AssertionError("FakeLlmGateway called more often than scripted")
        self.calls.append({"messages": list(messages), "tools": tools})
        return self._script.pop(0)


def text_message(text: str) -> dict:
    return {"role": "assistant", "content": text}


def tool_call_message(name: str, arguments: dict, call_id: str = "call_1") -> dict:
    return {
        "role": "assistant",
        "content": None,
        "tool_calls": [{
            "id": call_id,
            "type": "function",
            "function": {"name": name, "arguments": json.dumps(arguments)},
        }],
    }


def agent_client(client, fake_llm: FakeLlmGateway):
    app.dependency_overrides[get_llm_gateway] = lambda: fake_llm
    return client


def post_chat(client, message: str = "Wie war mein letztes Essen?") -> object:
    return client.post("/agent/chat", json={"message": message, "language": "de"})


def seed_food_reviews(uow: FakeUnitOfWork) -> None:
    for user_id, name in ((UID, "Ramen"), ("u-victim", "Secret Steak")):
        uow.food_reviews.docs.append({
            "food_review_id": f"fr-{user_id}", "review_id": f"rev-{user_id}",
            "restaurant_id": "r-1", "user_id": user_id, "food_name": name,
            "price": 12.5, "rating": 9.0, "created_at": "2026-09-01T12:00:00+00:00",
        })


# ==================== structural security controls ==================== #

def test_no_tool_schema_mentions_user_id():
    registry = ToolRegistry(FakeUnitOfWork(), "u-42")
    serialized = json.dumps(registry.schemas())
    assert "user_id" not in serialized
    # Catches a future tool interpolating the id into its own description.
    assert "u-42" not in serialized


def test_registry_requires_an_authenticated_user():
    with pytest.raises(ValueError):
        ToolRegistry(FakeUnitOfWork(), "")


def test_get_my_reviews_cannot_be_redirected(uow):
    seed_food_reviews(uow)
    registry = ToolRegistry(uow, UID)

    with pytest.raises(ValidationError) as excinfo:
        registry.dispatch("get_my_reviews", '{"user_id": "u-victim"}')
    assert excinfo.value.errors()[0]["type"] == "extra_forbidden"

    result = registry.dispatch("get_my_reviews", "{}")
    assert [r["food_name"] for r in result["food_reviews"]] == ["Ramen"]


def test_restaurant_signal_suppresses_single_person_aggregates(uow):
    seed_food_reviews(uow)  # two ratings on r-1 -> average allowed
    registry = ToolRegistry(uow, UID)
    assert registry.dispatch("get_restaurant_signal", '{"restaurant_id": "r-1"}') == {
        "restaurant_id": "r-1", "rating_count": 2, "avg_rating": 9.0,
    }

    uow.food_reviews.docs.pop()  # down to one rating -> IS one identifiable person
    result = registry.dispatch("get_restaurant_signal", '{"restaurant_id": "r-1"}')
    assert result["rating_count"] == 1
    assert result["avg_rating"] is None


# ==================== endpoint + loop semantics ==================== #

def test_chat_returns_text_blocks(client):
    fake = FakeLlmGateway([text_message("Dein letztes Essen war Ramen, 9/10.")])
    response = post_chat(agent_client(client, fake))

    assert response.status_code == 200
    assert response.json() == {
        "blocks": [{"kind": "text", "text": "Dein letztes Essen war Ramen, 9/10."}],
        "proposals": [],
    }


def test_chat_unavailable_without_configured_key(client):
    # No FakeLlmGateway override: the real provider guard runs with LLM_API_KEY="".
    response = post_chat(client)
    assert response.status_code == 503


def test_bad_llm_args_become_an_error_tool_result_not_a_500(client, uow):
    seed_food_reviews(uow)
    fake = FakeLlmGateway([
        tool_call_message("get_my_reviews", {"limit": 99}, call_id="call_bad"),
        text_message("Entschuldigung, das hat nicht geklappt."),
    ])
    response = post_chat(agent_client(client, fake))

    assert response.status_code == 200
    assert response.json()["proposals"] == []
    # The second LLM call must have received exactly one tool reply for call_bad,
    # carrying field-level details the model can self-correct from.
    tool_replies = [m for m in fake.calls[1]["messages"] if m.get("role") == "tool"]
    assert len(tool_replies) == 1
    assert tool_replies[0]["tool_call_id"] == "call_bad"
    error = json.loads(tool_replies[0]["content"])
    assert error["is_error"] is True
    assert error["details"][0]["loc"] == ["limit"]


def test_tool_results_round_trip_to_a_final_answer(client, uow):
    seed_food_reviews(uow)
    fake = FakeLlmGateway([
        tool_call_message("get_my_reviews", {}),
        text_message("Zuletzt: Ramen für 12,50 €, 9/10."),
    ])
    response = post_chat(agent_client(client, fake))

    assert response.status_code == 200
    payload = json.loads(
        [m for m in fake.calls[1]["messages"] if m.get("role") == "tool"][0]["content"]
    )
    assert payload["kind"] == "data"
    assert payload["data"]["food_reviews"][0]["food_name"] == "Ramen"
    assert response.json()["blocks"][0]["text"].startswith("Zuletzt")


def test_iteration_cap_yields_a_clean_fallback_reply(client, uow):
    """Stands between a prompt-loop bug and an exhausted free-tier quota."""
    seed_food_reviews(uow)
    fake = FakeLlmGateway([tool_call_message("get_my_reviews", {}, call_id=f"c{i}") for i in range(20)])
    response = post_chat(agent_client(client, fake))

    assert response.status_code == 200
    from src.config import settings
    assert len(fake.calls) == settings.agent_max_iterations
    # Tools are offered on the first three calls only; later calls must drop them.
    assert all(c["tools"] for c in fake.calls[:3])
    assert all(c["tools"] is None for c in fake.calls[3:])
    text = response.json()["blocks"][0]["text"]
    assert text  # a clean, non-empty reply — not a 500, not an empty block
