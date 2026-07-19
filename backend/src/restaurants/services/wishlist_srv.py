"""Wishlist-entries business logic."""

from src.unit_of_work import UnitOfWork
from src.restaurants.models import (
    CreateWishlistEntryRequest,
    GetWishlistByUserRequest,
    UpdateWishlistEntryRequest,
    DeleteWishlistEntryRequest,
    WishlistEntry,
)
from src.utils.wrappers import service


class WishlistService:
    """Manages a user's wishlist of restaurants to visit."""

    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    @service
    def create_wishlist_entry(self, request: CreateWishlistEntryRequest, user_id: str) -> str | None:
        """Create one wishlist entry."""
        if not self._uow.users.exists(user_id):
            raise ValueError("User ID not found in the db. Please set the user first.")

        entry = WishlistEntry(**request.model_dump(), user_id=user_id)
        return entry.entry_id if self._uow.wishlist.add(entry) else None

    @service
    def get_wishlist_by_user(self, request: GetWishlistByUserRequest) -> list[dict]:
        """Return all wishlist entries for a given user."""
        return self._uow.wishlist.list_by_user(request.user_id)

    @service
    def get_wishlist_entry_by_id(self, entry_id: str) -> dict | None:
        """Return a single wishlist entry by id."""
        return self._uow.wishlist.get(entry_id)

    @service
    def delete_wishlist_entry(self, request: DeleteWishlistEntryRequest) -> bool:
        """Delete a wishlist entry by id."""
        return self._uow.wishlist.delete(request.entry_id)

    @service
    def update_wishlist_entry(self, request: UpdateWishlistEntryRequest) -> bool:
        """Update the comment on a wishlist entry (empty/None clears it)."""
        comment = request.comment.strip() if request.comment else None
        return self._uow.wishlist.update_comment(request.entry_id, comment)

    @service
    def delete_wishlist_entry_by_user_and_restaurant(self, user_id: str, restaurant_id: str) -> bool:
        """Delete a wishlist entry by user id and restaurant id."""
        return self._uow.wishlist.delete_by_user_and_restaurant(user_id, restaurant_id)
