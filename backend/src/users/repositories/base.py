"""Persistence interfaces for the users domain.

These abstract base classes describe *what* the application needs from storage,
in domain terms — never *how* it is stored. The Mongo adapter in ``mongo.py``
implements them; a future SQL adapter would implement the same contract, and
nothing in the services or controllers would have to change.

Method return shapes are plain Python (``dict``/``User``/``bool``): no driver
types (ObjectId, cursors, ``$``-operators) ever cross this boundary.
"""

from abc import ABC, abstractmethod

from src.users.models import User


class UserRepository(ABC):
    """Storage contract for user records."""

    @abstractmethod
    def add(self, user: User) -> None:
        """Persist a new user. Raises ``AlreadyExistsError`` if the mail is taken."""

    @abstractmethod
    def exists(self, user_id: str) -> bool:
        """Return whether a user with ``user_id`` exists."""

    @abstractmethod
    def get_by_id(self, user_id: str) -> dict | None:
        """Return the full stored record (without the storage id), or ``None``."""

    @abstractmethod
    def get_by_mail(self, mail: str) -> dict | None:
        """Return the full stored record by mail (includes password hash), or ``None``."""

    @abstractmethod
    def list_all(self) -> list[dict]:
        """Return every user record (without the storage id)."""

    @abstractmethod
    def set_last_login(self, user_id: str, timestamp: str) -> None:
        """Record the user's most recent login time (ISO 8601 string)."""

    @abstractmethod
    def set_avatar(self, user_id: str, avatar: str) -> bool:
        """Store a base64 avatar thumbnail. Returns whether a record changed."""

    @abstractmethod
    def search_by_name_prefix(self, prefix: str, exclude_user_id: str) -> list[dict]:
        """Case-insensitive first/last-name prefix search, excluding one user.

        Returns lightweight profiles: ``user_id``, ``first_name``, ``last_name``,
        ``avatar``.
        """

    @abstractmethod
    def get_profiles(self, user_ids: list[str]) -> list[dict]:
        """Return lightweight profiles for the given ids.

        Each item has ``user_id``, ``first_name``, ``last_name``, ``avatar``.
        """


class FriendRepository(ABC):
    """Storage contract for friend connections (directional edges with a status)."""

    @abstractmethod
    def find(self, user_id: str, friend_user_id: str, status: str | None = None) -> dict | None:
        """Return the edge ``user_id -> friend_user_id`` (optionally status-filtered)."""

    @abstractmethod
    def add_pending(self, user_id: str, friend_user_id: str) -> None:
        """Create a pending edge ``user_id -> friend_user_id``."""

    @abstractmethod
    def set_status(self, user_id: str, friend_user_id: str, status: str) -> None:
        """Update the status of an existing edge ``user_id -> friend_user_id``."""

    @abstractmethod
    def upsert_status(self, user_id: str, friend_user_id: str, status: str) -> None:
        """Set the status of the edge, creating it if it does not exist."""

    @abstractmethod
    def delete(self, user_id: str, friend_user_id: str, status: str | None = None) -> None:
        """Delete the edge ``user_id -> friend_user_id`` (optionally status-filtered)."""

    @abstractmethod
    def list_for_user(self, user_id: str, status: str) -> list[dict]:
        """Return edges where ``user_id`` is the source and status matches."""

    @abstractmethod
    def list_for_friend(self, friend_user_id: str, status: str) -> list[dict]:
        """Return edges where ``friend_user_id`` is the target and status matches."""
