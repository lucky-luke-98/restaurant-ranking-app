from .base import UserRepository, FriendRepository
from .mongo import MongoUserRepository, MongoFriendRepository

__all__ = [
    "UserRepository",
    "FriendRepository",
    "MongoUserRepository",
    "MongoFriendRepository",
]
