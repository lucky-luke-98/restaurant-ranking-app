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
