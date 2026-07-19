"""Visited-entries business logic."""

from src.unit_of_work import UnitOfWork
from src.restaurants.models import (
    CreateVisitedEntryRequest,
    GetVisitedByUserRequest,
    DeleteVisitedEntryRequest,
    VisitedEntry,
)
from src.utils.wrappers import service


class VisitedService:
    """Marks restaurants as visited, including the atomic move from wishlist."""

    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    @service
    def create_visited_entry(self, request: CreateVisitedEntryRequest, user_id: str) -> str | None:
        """Create a visited entry for a user and restaurant (idempotent)."""
        if not self._uow.users.exists(user_id):
            raise ValueError("User ID not found in the db. Please set the user first.")

        existing = self._uow.visited.get_by_user_and_restaurant(user_id, request.restaurant_id)
        if existing:
            return existing["entry_id"]

        entry = VisitedEntry(**request.model_dump(), user_id=user_id)
        return entry.entry_id if self._uow.visited.add(entry) else None

    @service
    def get_visited_by_user(self, request: GetVisitedByUserRequest) -> list[dict]:
        """Return all visited entries for a given user."""
        return self._uow.visited.list_by_user(request.user_id)

    @service
    def get_visited_entry_by_id(self, entry_id: str) -> dict | None:
        """Return a single visited entry by id."""
        return self._uow.visited.get(entry_id)

    @service
    def delete_visited_entry(self, request: DeleteVisitedEntryRequest) -> bool:
        """Delete a visited entry by id."""
        return self._uow.visited.delete(request.entry_id)

    @service
    def move_wishlist_to_visited_entry(self, request: CreateVisitedEntryRequest, user_id: str) -> str | None:
        """Atomically move a restaurant from wishlist to visited (single transaction)."""
        if not self._uow.users.exists(user_id):
            raise ValueError("User ID not found in the db. Please set the user first.")

        with self._uow:
            existing = self._uow.visited.get_by_user_and_restaurant(user_id, request.restaurant_id)
            if existing:
                entry_id = existing["entry_id"]
            else:
                entry = VisitedEntry(**request.model_dump(), user_id=user_id)
                self._uow.visited.add(entry)
                entry_id = entry.entry_id
            self._uow.wishlist.delete_by_user_and_restaurant(user_id, request.restaurant_id)
        return entry_id
