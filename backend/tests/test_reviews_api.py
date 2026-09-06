"""Review endpoints against the fake Unit of Work: business rules, not serialization."""

from tests.conftest import TEST_USER

UID = TEST_USER["user_id"]


def seed_user_and_restaurant(uow, user_id: str = UID, restaurant_id: str = "r-1") -> None:
    uow.users.docs.append({"user_id": user_id, "mail": f"{user_id}@test.de", "first_name": "Testa"})
    uow.restaurants.docs.append({
        "restaurant_id": restaurant_id, "name": "Osteria Roma", "tags": [],
        "street": "Hauptstr. 1", "city": "Köln", "country": "DE",
    })


def make_review_payload(**overrides) -> dict:
    payload = {"restaurant_id": "r-1", "cleanliness_rating": 7.0, "experience_rating": 8.5}
    payload.update(overrides)
    return payload


def test_endpoints_require_authentication(anon_client):
    response = anon_client.get("/review/r-1")
    assert response.status_code == 403


def test_create_review_moves_author_to_visited_and_clears_wishlist(client, uow):
    seed_user_and_restaurant(uow)
    uow.wishlist.docs.append({"entry_id": "w-1", "user_id": UID, "restaurant_id": "r-1", "comment": None})

    response = client.post("/review", json=make_review_payload())

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert uow.reviews.get(body["review_id"]) is not None
    assert uow.visited.get_by_user_and_restaurant(UID, "r-1") is not None
    assert uow.wishlist.list_by_user(UID) == []


def test_create_review_rejects_unknown_user(client, uow):
    # No seeded user: the service must refuse rather than write an orphaned review.
    response = client.post("/review", json=make_review_payload())
    assert response.status_code == 500
    assert uow.reviews.docs == []


def test_create_review_rejects_self_coauthorship(client, uow):
    seed_user_and_restaurant(uow)
    response = client.post("/review", json=make_review_payload(coauthor_ids=[UID]))
    assert response.status_code == 500
    assert "coauthor" in response.json()["detail"]
    assert uow.reviews.docs == []


def test_create_review_moves_coauthors_to_visited_too(client, uow):
    seed_user_and_restaurant(uow)
    uow.users.docs.append({"user_id": "u-friend", "mail": "f@test.de", "first_name": "Anna"})

    response = client.post("/review", json=make_review_payload(coauthor_ids=["u-friend"]))

    assert response.status_code == 200
    assert uow.visited.get_by_user_and_restaurant("u-friend", "r-1") is not None


def test_oversized_images_are_dropped_small_ones_stored(client, uow):
    seed_user_and_restaurant(uow)
    small, oversized = "x" * 1000, "x" * 2_000_000

    response = client.post("/review", json=make_review_payload(images=[small, oversized]))

    assert response.status_code == 200
    stored = uow.images.list_by_review(response.json()["review_id"])
    assert [len(img["data"]) for img in stored] == [1000]


def test_delete_review_requires_ownership(client, uow):
    uow.reviews.docs.append({
        "review_id": "rev-1", "user_id": "somebody-else", "restaurant_id": "r-1",
        "cleanliness_rating": 5.0, "experience_rating": 5.0,
    })
    response = client.delete("/review/rev-1")
    assert response.status_code == 403
    assert uow.reviews.get("rev-1") is not None


def test_delete_review_cascades_food_reviews_and_images(client, uow):
    uow.reviews.docs.append({
        "review_id": "rev-1", "user_id": UID, "restaurant_id": "r-1",
        "cleanliness_rating": 5.0, "experience_rating": 5.0,
    })
    uow.food_reviews.docs.append({
        "food_review_id": "fr-1", "review_id": "rev-1", "restaurant_id": "r-1",
        "user_id": UID, "food_name": "Ramen", "price": 12.5, "rating": 9.0,
    })
    uow.images.docs.append({"image_id": "i-1", "review_id": "rev-1", "data": "abc"})
    uow.images.docs.append({"image_id": "i-2", "food_review_id": "fr-1", "data": "def"})

    response = client.delete("/review/rev-1")

    assert response.status_code == 200
    assert response.json()["success"] is True
    assert uow.reviews.docs == []
    assert uow.food_reviews.docs == []
    assert uow.images.docs == []


def test_update_review_forbidden_for_strangers(client, uow):
    uow.reviews.docs.append({
        "review_id": "rev-1", "user_id": "somebody-else", "restaurant_id": "r-1",
        "cleanliness_rating": 5.0, "experience_rating": 5.0,
    })
    response = client.put("/review", json={"review_id": "rev-1", "comment": "hijacked"})
    assert response.status_code == 403
    assert uow.reviews.get("rev-1")["cleanliness_rating"] == 5.0


def test_coauthor_may_edit_but_not_manage_coauthors(client, uow):
    uow.reviews.docs.append({
        "review_id": "rev-1", "user_id": "somebody-else", "restaurant_id": "r-1",
        "cleanliness_rating": 5.0, "experience_rating": 5.0, "coauthor_ids": [UID],
    })

    allowed = client.put("/review", json={"review_id": "rev-1", "comment": "we were here"})
    assert allowed.status_code == 200

    denied = client.put("/review", json={"review_id": "rev-1", "coauthor_ids": []})
    assert denied.status_code == 403
