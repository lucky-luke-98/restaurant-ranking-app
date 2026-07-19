"""MongoDB adapters implementing the users-domain repository interfaces."""

import re

from pymongo.errors import DuplicateKeyError

from src.config import settings
from src.db.base_repository import MongoRepository, SessionProvider
from src.db.errors import AlreadyExistsError
from src.users.models import User
from src.users.repositories.base import UserRepository, FriendRepository

# Lightweight profile projection reused across search/friends lookups.
_PROFILE_FIELDS = {"user_id": 1, "first_name": 1, "last_name": 1, "avatar": 1, "_id": 0}


class MongoUserRepository(MongoRepository, UserRepository):

    def __init__(self, session_provider: SessionProvider | None = None):
        super().__init__(settings.mongo_users_collection, session_provider)

    def add(self, user: User) -> None:
        try:
            self._collection.insert_one(user.model_dump(), session=self._session)
        except DuplicateKeyError as exc:
            raise AlreadyExistsError("A user with this email already exists.") from exc

    def exists(self, user_id: str) -> bool:
        return self._collection.find_one({"user_id": user_id}, session=self._session) is not None

    def get_by_id(self, user_id: str) -> dict | None:
        doc = self._collection.find_one({"user_id": user_id}, session=self._session)
        if doc:
            doc.pop("_id", None)
        return doc

    def get_by_mail(self, mail: str) -> dict | None:
        doc = self._collection.find_one({"mail": mail}, session=self._session)
        if doc:
            doc.pop("_id", None)
        return doc

    def list_all(self) -> list[dict]:
        users = list(self._collection.find({}, session=self._session))
        for user in users:
            user.pop("_id", None)
        return users

    def set_last_login(self, user_id: str, timestamp: str) -> None:
        self._collection.update_one(
            {"user_id": user_id},
            {"$set": {"last_logged_in": timestamp}},
            session=self._session,
        )

    def set_avatar(self, user_id: str, avatar: str) -> bool:
        result = self._collection.update_one(
            {"user_id": user_id},
            {"$set": {"avatar": avatar}},
            session=self._session,
        )
        return result.modified_count > 0

    def search_by_name_prefix(self, prefix: str, exclude_user_id: str) -> list[dict]:
        pattern = re.compile(f"^{re.escape(prefix)}", re.IGNORECASE)
        return list(self._collection.find(
            {
                "$and": [
                    {"user_id": {"$ne": exclude_user_id}},
                    {"$or": [
                        {"first_name": {"$regex": pattern}},
                        {"last_name": {"$regex": pattern}},
                    ]},
                ]
            },
            _PROFILE_FIELDS,
            session=self._session,
        ))

    def get_profiles(self, user_ids: list[str]) -> list[dict]:
        if not user_ids:
            return []
        return list(self._collection.find(
            {"user_id": {"$in": user_ids}},
            _PROFILE_FIELDS,
            session=self._session,
        ))


class MongoFriendRepository(MongoRepository, FriendRepository):

    def __init__(self, session_provider: SessionProvider | None = None):
        super().__init__(settings.mongo_friends_collection, session_provider)

    def find(self, user_id: str, friend_user_id: str, status: str | None = None) -> dict | None:
        query = {"user_id": user_id, "friend_user_id": friend_user_id}
        if status is not None:
            query["status"] = status
        return self._collection.find_one(query, session=self._session)

    def add_pending(self, user_id: str, friend_user_id: str) -> None:
        self._collection.insert_one(
            {"user_id": user_id, "friend_user_id": friend_user_id, "status": "pending"},
            session=self._session,
        )

    def set_status(self, user_id: str, friend_user_id: str, status: str) -> None:
        self._collection.update_one(
            {"user_id": user_id, "friend_user_id": friend_user_id},
            {"$set": {"status": status}},
            session=self._session,
        )

    def upsert_status(self, user_id: str, friend_user_id: str, status: str) -> None:
        self._collection.update_one(
            {"user_id": user_id, "friend_user_id": friend_user_id},
            {"$set": {"status": status}},
            upsert=True,
            session=self._session,
        )

    def delete(self, user_id: str, friend_user_id: str, status: str | None = None) -> None:
        query = {"user_id": user_id, "friend_user_id": friend_user_id}
        if status is not None:
            query["status"] = status
        self._collection.delete_one(query, session=self._session)

    def list_for_user(self, user_id: str, status: str) -> list[dict]:
        return list(self._collection.find(
            {"user_id": user_id, "status": status}, session=self._session
        ))

    def list_for_friend(self, friend_user_id: str, status: str) -> list[dict]:
        return list(self._collection.find(
            {"friend_user_id": friend_user_id, "status": status}, session=self._session
        ))
