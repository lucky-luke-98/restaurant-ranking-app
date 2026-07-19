"""Persistence interfaces for the restaurants domain.

One abstract repository per aggregate (restaurant, review, food review, image,
wishlist, visited). Methods speak in domain terms and return plain Python; all
query building (``$in``, aggregation pipelines, keyset cursors, ``$pull`` …)
lives in the adapter so it never leaks past this boundary.
"""

from abc import ABC, abstractmethod

from src.restaurants.models import (
    Restaurant,
    RestaurantReview,
    FoodReview,
    ReviewImage,
    FoodReviewImage,
    WishlistEntry,
    VisitedEntry,
)


class RestaurantRepository(ABC):

    @abstractmethod
    def add(self, restaurant: Restaurant) -> None:
        """Persist a restaurant. Raises ``AlreadyExistsError`` on duplicate place id."""

    @abstractmethod
    def get(self, restaurant_id: str) -> dict | None:
        """Return one restaurant by id (without the storage id), or ``None``."""

    @abstractmethod
    def get_by_google_place_id(self, google_place_id: str) -> dict | None:
        """Return one restaurant by its Google place id, or ``None``."""

    @abstractmethod
    def get_many(self, restaurant_ids: list[str]) -> list[dict]:
        """Return the restaurants for the given ids (without storage ids)."""

    @abstractmethod
    def list_all(self) -> list[dict]:
        """Return every restaurant (without storage ids)."""

    @abstractmethod
    def set_cuisine_type(self, restaurant_id: str, cuisine_type: str) -> None:
        """Update a restaurant's cuisine type."""

    @abstractmethod
    def delete(self, restaurant_id: str) -> bool:
        """Delete a restaurant. Returns whether a record was removed."""


class ReviewRepository(ABC):

    @abstractmethod
    def add(self, review: RestaurantReview, coauthor_ids: list[str]) -> bool:
        """Persist a restaurant review with optional coauthors. Returns success."""

    @abstractmethod
    def get(self, review_id: str) -> dict | None:
        """Return one review by id (without storage id), or ``None``."""

    @abstractmethod
    def find_authored(self, review_id: str, restaurant_id: str, user_id: str) -> dict | None:
        """Return the review only if ``user_id`` is its author or a coauthor and it
        belongs to ``restaurant_id``; otherwise ``None``."""

    @abstractmethod
    def list_for_restaurant(self, restaurant_id: str) -> list[dict]:
        """Return all reviews for a restaurant (without storage ids)."""

    @abstractmethod
    def list_reviewed_restaurant_ids(self, user_id: str) -> list[str]:
        """Return distinct restaurant ids the user has reviewed."""

    @abstractmethod
    def update_fields(self, review_id: str, updates: dict) -> bool:
        """Apply a partial field update. Returns whether a record changed."""

    @abstractmethod
    def pull_coauthor(self, review_id: str, user_id: str) -> bool:
        """Remove a coauthor from a review. Returns whether a record changed."""

    @abstractmethod
    def delete(self, review_id: str) -> bool:
        """Delete a review. Returns whether a record was removed."""

    @abstractmethod
    def find_friends_feed(
        self,
        friend_ids: list[str],
        exclude_user_id: str,
        cursor_created_at: str | None,
        cursor_review_id: str | None,
        limit: int,
    ) -> list[dict]:
        """Return a reverse-chronological page of reviews authored or coauthored by
        ``friend_ids`` (excluding ``exclude_user_id``). Returns up to ``limit + 1``
        rows so the caller can detect whether more exist."""

    @abstractmethod
    def max_visited_at_by_restaurant(self, user_id: str, restaurant_ids: list[str]) -> list[dict]:
        """Return ``[{restaurant_id, last_visited}]`` — the user's latest reviewed
        (or coauthored) visit date per restaurant."""


class FoodReviewRepository(ABC):

    @abstractmethod
    def add(self, food_review: FoodReview) -> bool:
        """Persist a food review. Returns success."""

    @abstractmethod
    def get(self, food_review_id: str) -> dict | None:
        """Return one food review by id (without storage id), or ``None``."""

    @abstractmethod
    def list_for_restaurant(self, restaurant_id: str) -> list[dict]:
        """Return all food reviews for a restaurant (without storage ids)."""

    @abstractmethod
    def list_ids_for_review(self, review_id: str) -> list[str]:
        """Return the ids of food reviews scoped to a restaurant review."""

    @abstractmethod
    def update_fields(self, food_review_id: str, updates: dict) -> bool:
        """Apply a partial field update. Returns whether a record changed."""

    @abstractmethod
    def delete(self, food_review_id: str) -> bool:
        """Delete a food review. Returns whether a record was removed."""

    @abstractmethod
    def delete_for_review(self, review_id: str) -> None:
        """Delete all food reviews scoped to a restaurant review."""

    @abstractmethod
    def rating_stats(self, restaurant_ids: list[str]) -> list[dict]:
        """Return ``[{restaurant_id, count, avg_rating}]`` (avg unrounded)."""

    @abstractmethod
    def max_visited_at_by_restaurant(self, user_id: str, restaurant_ids: list[str]) -> list[dict]:
        """Return ``[{restaurant_id, last_visited}]`` — the user's latest food-reviewed
        visit date per restaurant."""


class ImageRepository(ABC):

    @abstractmethod
    def add_review_image(self, image: ReviewImage) -> None:
        """Persist an image attached to a restaurant review."""

    @abstractmethod
    def add_food_review_image(self, image: FoodReviewImage) -> None:
        """Persist an image attached to a food review."""

    @abstractmethod
    def list_by_review(self, review_id: str) -> list[dict]:
        """Return all images for a restaurant review (without storage ids)."""

    @abstractmethod
    def list_by_food_review(self, food_review_id: str) -> list[dict]:
        """Return all images for a food review (without storage ids)."""

    @abstractmethod
    def delete_by_review(self, review_id: str) -> None:
        """Delete all images for a restaurant review."""

    @abstractmethod
    def delete_by_food_review(self, food_review_id: str) -> None:
        """Delete all images for a single food review."""

    @abstractmethod
    def delete_by_food_reviews(self, food_review_ids: list[str]) -> None:
        """Delete all images for the given food reviews."""


class WishlistRepository(ABC):

    @abstractmethod
    def add(self, entry: WishlistEntry) -> bool:
        """Persist a wishlist entry. Returns success."""

    @abstractmethod
    def get(self, entry_id: str) -> dict | None:
        """Return one wishlist entry by id (without storage id), or ``None``."""

    @abstractmethod
    def list_by_user(self, user_id: str) -> list[dict]:
        """Return all wishlist entries for a user (without storage ids)."""

    @abstractmethod
    def update_comment(self, entry_id: str, comment: str | None) -> bool:
        """Update the comment on an entry. Returns whether a record changed."""

    @abstractmethod
    def delete(self, entry_id: str) -> bool:
        """Delete a wishlist entry by id. Returns whether a record was removed."""

    @abstractmethod
    def delete_by_user_and_restaurant(self, user_id: str, restaurant_id: str) -> bool:
        """Delete a user's wishlist entry for a restaurant. Returns success."""


class VisitedRepository(ABC):

    @abstractmethod
    def add(self, entry: VisitedEntry) -> bool:
        """Persist a visited entry. Returns success."""

    @abstractmethod
    def get(self, entry_id: str) -> dict | None:
        """Return one visited entry by id (without storage id), or ``None``."""

    @abstractmethod
    def get_by_user_and_restaurant(self, user_id: str, restaurant_id: str) -> dict | None:
        """Return a user's visited entry for a restaurant, or ``None``."""

    @abstractmethod
    def list_by_user(self, user_id: str) -> list[dict]:
        """Return all visited entries for a user (without storage ids)."""

    @abstractmethod
    def delete(self, entry_id: str) -> bool:
        """Delete a visited entry by id. Returns whether a record was removed."""
