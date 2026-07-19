"""Users-domain business logic.

Services hold orchestration and rules; they reach persistence only through the
injected :class:`UnitOfWork`, never through Mongo directly. That is what lets the
database be swapped without touching this file.
"""

from datetime import datetime, timezone

from src.db.errors import AlreadyExistsError
from src.unit_of_work import UnitOfWork
from src.utils.wrappers import service
from src.utils.auth import hash_password, verify_password
from src.users.models import (
    User,
    CreateUserRequest,
    RegisterRequest,
    LoginRequest,
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class UserService:
    """User accounts: listing, registration, authentication, profile."""

    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    @service
    def get_all_users(self) -> list[dict]:
        """Return all users with sensitive fields removed."""
        users = self._uow.users.list_all()
        for user in users:
            user.pop("password_hash", None)
        return users

    @service
    def create_user(self, request: CreateUserRequest) -> bool:
        """Create a user. Raises ValueError if the mail is already taken."""
        user = User(**request.model_dump(), password_hash="")
        try:
            self._uow.users.add(user)
        except AlreadyExistsError as exc:
            raise ValueError(str(exc))
        return True

    @service
    def register_user(self, request: RegisterRequest) -> User:
        """Create a user with a hashed password. Raises ValueError if mail taken."""
        user = User(
            first_name=request.first_name,
            last_name=request.last_name,
            mail=request.mail,
            password_hash=hash_password(request.password),
        )
        try:
            self._uow.users.add(user)
        except AlreadyExistsError as exc:
            raise ValueError(str(exc))
        self._uow.users.set_last_login(user.user_id, _now_iso())
        return user

    @service
    def authenticate_user(self, request: LoginRequest) -> User:
        """Verify credentials and return the user. Raises ValueError on failure."""
        doc = self._uow.users.get_by_mail(request.mail)
        if not doc or not verify_password(request.password, doc.get("password_hash", "")):
            raise ValueError("Invalid email or password.")
        self._uow.users.set_last_login(doc["user_id"], _now_iso())
        return User(**doc)

    @service
    def get_me(self, user_id: str) -> dict | None:
        """Return the user's own record without the password hash, or None."""
        doc = self._uow.users.get_by_id(user_id)
        if not doc:
            return None
        doc.pop("password_hash", None)
        return doc

    @service
    def update_user_avatar(self, user_id: str, avatar: str) -> bool:
        """Store a base64-encoded thumbnail as the user's profile picture."""
        return self._uow.users.set_avatar(user_id, avatar)

    @service
    def verify_user_entry(self, user_id: str) -> bool:
        """Return whether a user exists."""
        return self._uow.users.exists(user_id)

    @service
    def search_users(self, query: str, current_user_id: str) -> list[dict]:
        """Search users by first/last-name prefix, excluding the current user."""
        return self._uow.users.search_by_name_prefix(query, current_user_id)


class FriendService:
    """Friend connections: requests, acceptance, listing."""

    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    @service
    def send_friend_request(self, user_id: str, friend_user_id: str) -> str:
        """Create a pending request. Returns "accepted" if the reverse request
        already existed (auto-accept) or a friendship exists, else "requested"."""
        if user_id == friend_user_id:
            raise ValueError("Cannot add yourself as a friend.")
        if not self._uow.users.exists(friend_user_id):
            raise ValueError("Friend user not found.")

        friends = self._uow.friends
        if friends.find(user_id, friend_user_id, "accepted"):
            return "accepted"
        if friends.find(user_id, friend_user_id, "pending"):
            return "requested"

        if friends.find(friend_user_id, user_id, "pending"):
            friends.set_status(friend_user_id, user_id, "accepted")
            friends.upsert_status(user_id, friend_user_id, "accepted")
            return "accepted"

        friends.add_pending(user_id, friend_user_id)
        return "requested"

    @service
    def accept_friend_request(self, user_id: str, requester_user_id: str) -> bool:
        """Accept a pending request from requester_user_id and mirror the edge."""
        friends = self._uow.friends
        if not friends.find(requester_user_id, user_id, "pending"):
            raise ValueError("Friend request not found.")
        friends.set_status(requester_user_id, user_id, "accepted")
        friends.upsert_status(user_id, requester_user_id, "accepted")
        return True

    @service
    def decline_friend_request(self, user_id: str, requester_user_id: str) -> bool:
        """Decline (delete) a pending request from requester_user_id."""
        self._uow.friends.delete(requester_user_id, user_id, "pending")
        return True

    @service
    def cancel_friend_request(self, user_id: str, recipient_user_id: str) -> bool:
        """Cancel an outgoing pending request to recipient_user_id."""
        self._uow.friends.delete(user_id, recipient_user_id, "pending")
        return True

    @service
    def remove_friend(self, user_id: str, friend_user_id: str) -> bool:
        """Remove a bidirectional friend connection in any status."""
        self._uow.friends.delete(user_id, friend_user_id)
        self._uow.friends.delete(friend_user_id, user_id)
        return True

    @service
    def get_friends(self, user_id: str) -> list[dict]:
        """Return accepted friends with their profile info."""
        entries = self._uow.friends.list_for_user(user_id, "accepted")
        friend_ids = [e["friend_user_id"] for e in entries]
        return self._uow.users.get_profiles(friend_ids)

    @service
    def get_incoming_friend_requests(self, user_id: str) -> list[dict]:
        """Return users who have sent a pending request to user_id."""
        entries = self._uow.friends.list_for_friend(user_id, "pending")
        requester_ids = [e["user_id"] for e in entries]
        return self._uow.users.get_profiles(requester_ids)

    @service
    def get_outgoing_friend_requests(self, user_id: str) -> list[dict]:
        """Return users user_id has sent a pending request to."""
        entries = self._uow.friends.list_for_user(user_id, "pending")
        recipient_ids = [e["friend_user_id"] for e in entries]
        return self._uow.users.get_profiles(recipient_ids)
