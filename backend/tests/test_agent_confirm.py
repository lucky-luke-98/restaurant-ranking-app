"""Step-6 propose/confirm tests — the write-path security controls from the plan §9."""

import json

import pytest
from pydantic import ValidationError

from src.agent.models import DraftReviewArgs
from src.dependencies import get_llm_gateway
from src.main import app
from tests.conftest import TEST_USER
from tests.fakes import FakeUnitOfWork
from tests.test_agent import FakeLlmGateway, agent_client, post_chat, text_message, tool_call_message

UID = TEST_USER["user_id"]

DRAFT_ARGS = {
    "restaurant_id": "r-1",
    "cleanliness_rating": 7.0,
    "experience_rating": 9.0,
    "comment": "Super Abend",
    "visited_at": "2026-09-01",
    "food_items": [
        {"food_name": "Käsespätzle", "price": 12.5, "rating": 9.0, "comment": None},
    ],
}


def seed(uow: FakeUnitOfWork) -> None:
    uow.users.docs.append({"user_id": UID, "mail": "t@t.de", "first_name": "Testa"})
    uow.restaurants.docs.append({
        "restaurant_id": "r-1", "name": "Osteria Roma", "tags": [],
        "street": "Hauptstr. 1", "city": "Köln", "country": "DE",
    })


def confirm_payload(proposal: dict) -> dict:
    return {
        "kind": proposal["kind"],
        "proposal_id": proposal["proposal_id"],
        "payload": json.loads(json.dumps(proposal["payload"])),
    }


# ==================== drafting (agent side) ==================== #

def test_draft_review_returns_a_proposal_and_writes_nothing(client, uow):
    seed(uow)
    fake = FakeLlmGateway([tool_call_message("draft_review", DRAFT_ARGS)])
    response = post_chat(agent_client(client, fake), "Speichere meine Bewertung für Osteria Roma")

    assert response.status_code == 200
    body = response.json()
    # Reply composed in app code: exactly one LLM call, no 4th-call token bill.
    assert len(fake.calls) == 1
    assert [b["kind"] for b in body["blocks"]] == ["text", "proposal"]
    # The block must CARRY the proposal — the response model silently strips fields
    # it does not declare, which is exactly the bug this line guards against.
    assert body["blocks"][1]["proposal"]["payload"]["restaurant_id"] == "r-1"
    proposal = body["proposals"][0]
    assert proposal["kind"] == "restaurant_review"
    assert proposal["display"]["restaurant_name"] == "Osteria Roma"
    assert proposal["payload"]["food_items"][0]["food_name"] == "Käsespätzle"
    # NOTHING was written.
    assert uow.reviews.docs == [] and uow.food_reviews.docs == [] and uow.visited.docs == []


def test_draft_review_with_invented_restaurant_id_is_a_retryable_error(client, uow):
    seed(uow)
    fake = FakeLlmGateway([
        tool_call_message("draft_review", {**DRAFT_ARGS, "restaurant_id": "r-invented"}),
        text_message("Das Restaurant kenne ich nicht — bitte füge es zuerst in der App hinzu."),
    ])
    response = post_chat(agent_client(client, fake))

    assert response.status_code == 200
    assert response.json()["proposals"] == []
    error = json.loads([m for m in fake.calls[1]["messages"] if m.get("role") == "tool"][0]["content"])
    assert error["is_error"] is True and "r-invented" in error["error"]


def test_bad_draft_args_become_an_error_tool_result_not_a_500(client, uow):
    seed(uow)
    fake = FakeLlmGateway([
        tool_call_message("draft_review", {**DRAFT_ARGS, "cleanliness_rating": 99}),
        text_message("Die Sauberkeit muss zwischen 0 und 10 liegen — wie sauber war es?"),
    ])
    response = post_chat(agent_client(client, fake))

    assert response.status_code == 200
    assert response.json()["proposals"] == []
    error = json.loads([m for m in fake.calls[1]["messages"] if m.get("role") == "tool"][0]["content"])
    assert error["is_error"] is True
    assert error["details"][0]["loc"] == ["cleanliness_rating"]


# ==================== confirming (write side) ==================== #

def draft_then_confirm(client, uow, fake=None):
    fake = fake or FakeLlmGateway([tool_call_message("draft_review", DRAFT_ARGS)])
    proposal = post_chat(agent_client(client, fake)).json()["proposals"][0]
    return proposal, client.post("/agent/confirm", json=confirm_payload(proposal))


def test_confirm_writes_review_food_items_and_visited(client, uow):
    seed(uow)
    uow.wishlist.docs.append({"entry_id": "w-1", "user_id": UID, "restaurant_id": "r-1", "comment": None})
    proposal, response = draft_then_confirm(client, uow)

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["review_id"] == proposal["proposal_id"]  # idempotency key became the id
    review = uow.reviews.get(body["review_id"])
    assert review["user_id"] == UID and review["experience_rating"] == 9.0
    assert [f["food_name"] for f in uow.food_reviews.docs] == ["Käsespätzle"]
    assert uow.visited.get_by_user_and_restaurant(UID, "r-1") is not None
    assert uow.wishlist.list_by_user(UID) == []  # _move_to_visited fired


def test_confirm_uses_the_jwt_user_id_not_the_payload(client, uow):
    """Highest-value test in the suite: /agent/confirm is the only agent endpoint that writes."""
    seed(uow)
    fake = FakeLlmGateway([tool_call_message("draft_review", DRAFT_ARGS)])
    proposal = post_chat(agent_client(client, fake)).json()["proposals"][0]

    smuggled = confirm_payload(proposal)
    smuggled["payload"]["user_id"] = "u-victim"
    response = client.post("/agent/confirm", json=smuggled)
    assert response.status_code == 422  # extra_forbidden — visible, not silently dropped
    assert uow.reviews.docs == []

    clean = client.post("/agent/confirm", json=confirm_payload(proposal))
    assert clean.status_code == 200
    assert uow.reviews.docs[0]["user_id"] == UID  # from the JWT, nowhere else


def test_double_confirm_returns_409_and_stores_one_review(client, uow):
    seed(uow)
    proposal, first = draft_then_confirm(client, uow)
    assert first.status_code == 200

    second = client.post("/agent/confirm", json=confirm_payload(proposal))
    assert second.status_code == 409
    assert len(uow.reviews.docs) == 1
    assert len(uow.food_reviews.docs) == 1


def test_confirm_rejects_unknown_kind(client, uow):
    seed(uow)
    proposal, _ = draft_then_confirm(client, uow)
    bad = confirm_payload(proposal)
    bad["kind"] = "drop_all_tables"
    assert client.post("/agent/confirm", json=bad).status_code == 400


# ==================== German coercion (§7) ==================== #

def test_german_coercion_net():
    args = DraftReviewArgs.model_validate({
        "restaurant_id": "r-1",
        "cleanliness_rating": "7,5",
        "experience_rating": "9,0",
        "visited_at": "heute",
        "food_items": [
            {"food_name": "Döner", "price": "12,50", "rating": "8,5"},
            {"food_name": "Ayran", "price": "1.234,50 €", "rating": 7},
        ],
    })
    assert args.cleanliness_rating == 7.5
    assert args.food_items[0].price == 12.5
    assert args.food_items[1].price == 1234.5
    from datetime import date
    assert args.visited_at == date.today()


def test_nonsense_date_raises_for_model_retry():
    with pytest.raises(ValidationError) as excinfo:
        DraftReviewArgs.model_validate({
            "restaurant_id": "r-1", "cleanliness_rating": 5, "experience_rating": 5,
            "visited_at": "letzten Freitag",
        })
    assert excinfo.value.errors()[0]["loc"] == ("visited_at",)
