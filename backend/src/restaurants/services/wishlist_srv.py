
from src.config import settings
from src.db.mongo_client import get_mongo_collection
from src.restaurants.models import (
    CreateWishlistEntryRequest,
    GetWishlistByUserRequest,
    UpdateWishlistEntryRequest,
    DeleteWishlistEntryRequest,
    WishlistEntry,
)
from src.users.services import verify_user_entry
from src.utils.wrappers import service


@service
def create_wishlist_entry(request: CreateWishlistEntryRequest, user_id: str) -> str | None:
    """
    Creates one restaurant wishlist entry based on provided information.
    """
    if not verify_user_entry(user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    wishlist_entry = WishlistEntry(**request.model_dump(), user_id=user_id)
    result = collection.insert_one(wishlist_entry.model_dump())
    if result.acknowledged:
        return wishlist_entry.entry_id
    return None


@service
def get_wishlist_by_user(request: GetWishlistByUserRequest) -> list[dict]:
    """
    Returns all wishlist entries for a given user.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    entries = list(collection.find({"user_id": request.user_id}))
    for entry in entries:
        entry.pop("_id", None)
    return entries


@service
def get_wishlist_entry_by_id(entry_id: str) -> dict | None:
    """Returns a single wishlist entry by its ID."""
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    entry = collection.find_one({"entry_id": entry_id})
    if entry:
        entry.pop("_id", None)
    return entry


@service
def delete_wishlist_entry(request: DeleteWishlistEntryRequest) -> bool:
    """
    Deletes a wishlist entry by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    result = collection.delete_one({"entry_id": request.entry_id})
    return result.deleted_count > 0


@service
def update_wishlist_entry(request: UpdateWishlistEntryRequest) -> bool:
    """
    Updates the comment on a wishlist entry. Pass comment=None or empty string to clear it.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    comment = request.comment.strip() if request.comment else None
    result = collection.update_one(
        {"entry_id": request.entry_id},
        {"$set": {"comment": comment or None}},
    )
    return result.modified_count > 0


def delete_wishlist_entry_by_user_and_restaurant(user_id: str, restaurant_id: str) -> bool:
    """
    Deletes a wishlist entry by user ID and restaurant ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    result = collection.delete_one({"user_id": user_id, "restaurant_id": restaurant_id})
    return result.deleted_count > 0