"""The atomicity probe from docs/agent-architecture.md §10, as a repeatable test.

Proves that writes on different repositories join ONE transaction through the shared
``session_provider`` in ``MongoUnitOfWork`` — not merely that transactions don't error.
Needs a real replica set:  docker compose up -d mongo  (then: pytest -m mongo).
"""

import pytest

from src.db.mongo_client import close_mongo_client, get_mongo_collection, initialize_mongo_client
from src.restaurants.models import VisitedEntry, WishlistEntry
from src.unit_of_work import MongoUnitOfWork

pytestmark = pytest.mark.mongo

UID, RID = "txn-probe-user", "txn-probe-restaurant"


@pytest.fixture
def mongo_uow():
    try:
        initialize_mongo_client()
    except Exception as exc:  # pragma: no cover - environment guard
        pytest.skip(f"No local MongoDB replica set available: {exc}")
    for name in ("visited", "wishlist"):
        get_mongo_collection(name).delete_many({"user_id": UID})
    yield MongoUnitOfWork()
    for name in ("visited", "wishlist"):
        get_mongo_collection(name).delete_many({"user_id": UID})
    close_mongo_client()


def test_transaction_commits_writes_across_repositories(mongo_uow):
    mongo_uow.wishlist.add(WishlistEntry(user_id=UID, restaurant_id=RID))

    with mongo_uow:
        mongo_uow.visited.add(VisitedEntry(user_id=UID, restaurant_id=RID))
        mongo_uow.wishlist.delete_by_user_and_restaurant(UID, RID)

    assert mongo_uow.visited.get_by_user_and_restaurant(UID, RID) is not None
    assert mongo_uow.wishlist.list_by_user(UID) == []


def test_double_confirm_creates_one_review_and_aborts_the_second(mongo_uow):
    """Plan §9 test 5: proves the confirm transaction aborts rather than half-applying —
    the second confirm must leave exactly one review AND one food item."""
    from uuid import uuid4

    import pytest as _pytest

    from src.agent.services.confirm_srv import ConfirmService
    from src.db.errors import AlreadyExistsError

    users = get_mongo_collection("users")
    restaurants = get_mongo_collection("restaurants")
    reviews = get_mongo_collection("reviews")
    food_reviews = get_mongo_collection("food_reviews")
    for coll in (users, restaurants, reviews, food_reviews):
        coll.delete_many({"$or": [{"user_id": UID}, {"restaurant_id": RID}]})

    users.insert_one({"user_id": UID, "mail": f"{UID}@test.dev", "first_name": "Txn"})
    restaurants.insert_one({"restaurant_id": RID, "name": "Txn Grill", "tags": [],
                            "street": "S", "city": "C", "country": "DE"})
    payload = {
        "restaurant_id": RID, "cleanliness_rating": 7.0, "experience_rating": 8.0,
        "comment": None, "visited_at": None,
        "food_items": [{"food_name": "Probe", "price": 9.9, "rating": 8.0, "comment": None}],
    }
    proposal_id = str(uuid4())

    service = ConfirmService(mongo_uow)
    first = service.confirm(kind="restaurant_review", proposal_id=proposal_id,
                            payload=payload, user_id=UID)
    assert first["review_id"] == proposal_id

    with _pytest.raises(AlreadyExistsError):
        service.confirm(kind="restaurant_review", proposal_id=proposal_id,
                        payload=payload, user_id=UID)

    assert reviews.count_documents({"review_id": proposal_id}) == 1
    assert food_reviews.count_documents({"review_id": proposal_id}) == 1

    for coll in (users, restaurants, reviews, food_reviews):
        coll.delete_many({"$or": [{"user_id": UID}, {"restaurant_id": RID}]})


def test_transaction_rolls_back_all_repositories_together(mongo_uow):
    """If these writes moved independently, the shared session wiring is broken —
    exactly the failure the atomic review write (propose/confirm) would sit on."""
    mongo_uow.wishlist.add(WishlistEntry(user_id=UID, restaurant_id=RID))

    with pytest.raises(RuntimeError, match="txn probe"):
        with mongo_uow:
            mongo_uow.visited.add(VisitedEntry(user_id=UID, restaurant_id=RID))
            mongo_uow.wishlist.delete_by_user_and_restaurant(UID, RID)
            raise RuntimeError("txn probe")

    assert mongo_uow.visited.get_by_user_and_restaurant(UID, RID) is None
    assert len(mongo_uow.wishlist.list_by_user(UID)) == 1
