"""Unit of Work: the single seam between the application and its database.

A Unit of Work bundles one instance of every repository and owns the transaction
boundary. Services depend on this abstraction (never on Mongo), so switching the
backing store means writing one new ``UnitOfWork`` subclass and changing the
provider in ``src/dependencies.py`` — nothing in the services or controllers
moves.

Usage:

    # plain, unscoped operations (most endpoints):
    uow.reviews.get(review_id)

    # atomic, multi-repository operations:
    with uow:                       # opens a transaction
        uow.visited.add(entry)
        uow.wishlist.delete_by_user_and_restaurant(user_id, restaurant_id)
    # commits on clean exit, rolls back if an exception propagates
"""

from abc import ABC, abstractmethod

from src.db.mongo_client import get_mongo_client
from src.users.repositories import (
    UserRepository,
    FriendRepository,
    MongoUserRepository,
    MongoFriendRepository,
)
from src.restaurants.repositories import (
    RestaurantRepository,
    ReviewRepository,
    FoodReviewRepository,
    ImageRepository,
    WishlistRepository,
    VisitedRepository,
    MongoRestaurantRepository,
    MongoReviewRepository,
    MongoFoodReviewRepository,
    MongoImageRepository,
    MongoWishlistRepository,
    MongoVisitedRepository,
)


class UnitOfWork(ABC):
    """Aggregates every repository and manages a transaction as a context manager."""

    users: UserRepository
    friends: FriendRepository
    restaurants: RestaurantRepository
    reviews: ReviewRepository
    food_reviews: FoodReviewRepository
    images: ImageRepository
    wishlist: WishlistRepository
    visited: VisitedRepository

    @abstractmethod
    def __enter__(self) -> "UnitOfWork":
        """Begin a transaction. Repositories accessed inside join it."""

    @abstractmethod
    def __exit__(self, exc_type, exc, tb) -> None:
        """Commit on clean exit, roll back if an exception propagated."""

    @abstractmethod
    def commit(self) -> None:
        """Commit the current transaction."""

    @abstractmethod
    def rollback(self) -> None:
        """Abort the current transaction."""


class MongoUnitOfWork(UnitOfWork):
    """MongoDB Unit of Work. Repositories share the session opened by ``__enter__``.

    Constructing this is cheap (no I/O): repositories only resolve the collection
    and session lazily, when a method is actually called.
    """

    def __init__(self):
        self._session = None
        self._session_cm = None
        # Every repository reads the *current* session through this provider, so a
        # transaction opened later is transparently picked up by all of them.
        session_provider = lambda: self._session

        self.users = MongoUserRepository(session_provider)
        self.friends = MongoFriendRepository(session_provider)
        self.restaurants = MongoRestaurantRepository(session_provider)
        self.reviews = MongoReviewRepository(session_provider)
        self.food_reviews = MongoFoodReviewRepository(session_provider)
        self.images = MongoImageRepository(session_provider)
        self.wishlist = MongoWishlistRepository(session_provider)
        self.visited = MongoVisitedRepository(session_provider)

    def __enter__(self) -> "MongoUnitOfWork":
        self._session_cm = get_mongo_client().start_session()
        self._session = self._session_cm.__enter__()
        self._session.start_transaction()
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        try:
            if self._session is not None and self._session.in_transaction:
                if exc_type is not None:
                    self._session.abort_transaction()
                else:
                    self._session.commit_transaction()
        finally:
            if self._session_cm is not None:
                self._session_cm.__exit__(exc_type, exc, tb)
            self._session = None
            self._session_cm = None

    def commit(self) -> None:
        if self._session is not None and self._session.in_transaction:
            self._session.commit_transaction()

    def rollback(self) -> None:
        if self._session is not None and self._session.in_transaction:
            self._session.abort_transaction()
