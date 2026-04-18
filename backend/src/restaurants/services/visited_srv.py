

from src.config import settings
from src.restaurants.models import (
    CreateVisitedEntryRequest,
    GetVisitedByUserRequest,
    DeleteVisitedEntryRequest,
    VisitedEntry
)
from src.db.mongo_client import get_mongo_client, get_mongo_collection
from src.users.services import verify_user_entry
from src.utils.wrappers import service


@service
def create_visited_entry(request: CreateVisitedEntryRequest, user_id: str) -> str | None:
    """
    Creates a visited entry for a user and restaurant.
    """
    if not verify_user_entry(user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    existing = collection.find_one({"user_id": user_id, "restaurant_id": request.restaurant_id})
    if existing:
        return existing["entry_id"]

    visited_entry = VisitedEntry(**request.model_dump(), user_id=user_id)
    result = collection.insert_one(visited_entry.model_dump())
    if result.acknowledged:
        return visited_entry.entry_id
    return None


@service
def get_visited_by_user(request: GetVisitedByUserRequest) -> list[dict]:
    """
    Returns all visited entries for a given user.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    entries = list(collection.find({"user_id": request.user_id}))
    for entry in entries:
        entry.pop("_id", None)
    return entries


@service
def get_visited_entry_by_id(entry_id: str) -> dict | None:
    """Returns a single visited entry by its ID."""
    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    entry = collection.find_one({"entry_id": entry_id})
    if entry:
        entry.pop("_id", None)
    return entry


@service
def delete_visited_entry(request: DeleteVisitedEntryRequest) -> bool:
    """
    Deletes a visited entry by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    result = collection.delete_one({"entry_id": request.entry_id})
    return result.deleted_count > 0


@service
def move_wishlist_to_visited_entry(request: CreateVisitedEntryRequest, user_id: str) -> str | None:
    """
    Atomically moves a restaurant from wishlist to visited using a transaction.
    """
    if not verify_user_entry(user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    client = get_mongo_client()
    visited_col = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    wishlist_col = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)

    # for atomicity
    with client.start_session() as session:
        with session.start_transaction():
            existing = visited_col.find_one(
                {"user_id": user_id, "restaurant_id": request.restaurant_id},
                session=session,
            )
            if existing:
                entry_id = existing["entry_id"]
            else:
                visited_entry = VisitedEntry(**request.model_dump(), user_id=user_id)
                visited_col.insert_one(visited_entry.model_dump(), session=session)
                entry_id = visited_entry.entry_id

            wishlist_col.delete_one(
                {"user_id": user_id, "restaurant_id": request.restaurant_id},
                session=session,
            )
    return entry_id