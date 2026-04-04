from datetime import datetime, timezone

from src.db.mongo_client import get_mongo_collection
from src.utils.wrappers import service
from src.utils.auth import hash_password, verify_password
from src.users.models import (
    User,
    CreateUserRequest,
    RegisterRequest,
    LoginRequest,
)
from src.config import settings


@service
def get_all_users_from_db() -> list[dict]:
    """
    Service to get all users from the mongo db instance.
    """
    collection = get_mongo_collection(settings.mongo_users_collection)

    # get all entries and clean up.
    users = list(collection.find({}))
    for user in users:
        assert isinstance(user, dict), "User data should be a dictionary."
        user.pop("_id", None)
        user.pop("password_hash", None)
    return users


@service
def create_one_user(request: CreateUserRequest) -> bool:
    """
    Creates a new user in the database. Raises ValueError if mail is already taken.
    """
    collection = get_mongo_collection(settings.mongo_users_collection)

    if collection.find_one({"mail": request.mail}):
        raise ValueError("A user with this email already exists.")

    user_instance = User(**request.model_dump(), password_hash="")
    result = collection.insert_one(user_instance.model_dump())
    return result.acknowledged


@service
def register_user(request: RegisterRequest) -> User:
    """
    Creates a new user with a hashed password. Raises ValueError if mail already taken.
    """
    collection = get_mongo_collection(settings.mongo_users_collection)

    if collection.find_one({"mail": request.mail}):
        raise ValueError("A user with this email already exists.")

    user = User(
        first_name=request.first_name,
        last_name=request.last_name,
        mail=request.mail,
        password_hash=hash_password(request.password),
    )
    doc = user.model_dump()
    doc["last_logged_in"] = datetime.now(timezone.utc).isoformat()
    collection.insert_one(doc)
    return user


@service
def authenticate_user(request: LoginRequest) -> User:
    """
    Verifies credentials and returns the User. Raises ValueError on bad credentials.
    """
    collection = get_mongo_collection(settings.mongo_users_collection)
    doc = collection.find_one({"mail": request.mail})

    if not doc or not verify_password(request.password, doc.get("password_hash", "")):
        raise ValueError("Invalid email or password.")

    collection.update_one(
        {"user_id": doc["user_id"]},
        {"$set": {"last_logged_in": datetime.now(timezone.utc).isoformat()}},
    )

    doc.pop("_id", None)
    doc.pop("last_logged_in", None)
    return User(**doc)


@service
def update_user_avatar(user_id: str, avatar: str) -> bool:
    """
    Stores a base64-encoded thumbnail as the user's profile picture.
    """
    collection = get_mongo_collection(settings.mongo_users_collection)
    result = collection.update_one(
        {"user_id": user_id},
        {"$set": {"avatar": avatar}},
    )
    return result.modified_count > 0


@service
def verify_user_entry(user_id: str) -> bool:
    """
    Verifies that a specified user exists in the db instance.
    """
    collection = get_mongo_collection(settings.mongo_users_collection)
    return collection.find_one({"user_id": user_id}) is not None


@service
def search_users(query: str, current_user_id: str) -> list[dict]:
    """
    Searches users by first_name or last_name (case-insensitive prefix match).
    Excludes the current user. Returns user_id, first_name, last_name, avatar.
    """
    import re
    collection = get_mongo_collection(settings.mongo_users_collection)
    pattern = re.compile(f"^{re.escape(query)}", re.IGNORECASE)
    users = list(collection.find(
        {
            "$and": [
                {"user_id": {"$ne": current_user_id}},
                {"$or": [
                    {"first_name": {"$regex": pattern}},
                    {"last_name": {"$regex": pattern}},
                ]},
            ]
        },
        {"user_id": 1, "first_name": 1, "last_name": 1, "avatar": 1, "_id": 0},
    ))
    return users


@service
def add_friend(user_id: str, friend_user_id: str) -> bool:
    """
    Creates a bidirectional friend connection.
    """
    collection = get_mongo_collection(settings.mongo_friends_collection)
    existing = collection.find_one({
        "user_id": user_id, "friend_user_id": friend_user_id,
    })
    if existing:
        return True
    collection.insert_one({"user_id": user_id, "friend_user_id": friend_user_id})
    collection.insert_one({"user_id": friend_user_id, "friend_user_id": user_id})
    return True


@service
def remove_friend(user_id: str, friend_user_id: str) -> bool:
    """
    Removes a bidirectional friend connection.
    """
    collection = get_mongo_collection(settings.mongo_friends_collection)
    collection.delete_one({"user_id": user_id, "friend_user_id": friend_user_id})
    collection.delete_one({"user_id": friend_user_id, "friend_user_id": user_id})
    return True


@service
def get_friends(user_id: str) -> list[dict]:
    """
    Returns all friends for a user with their profile info.
    """
    friends_collection = get_mongo_collection(settings.mongo_friends_collection)
    users_collection = get_mongo_collection(settings.mongo_users_collection)
    friend_entries = list(friends_collection.find({"user_id": user_id}))
    friend_ids = [f["friend_user_id"] for f in friend_entries]
    if not friend_ids:
        return []
    friends = list(users_collection.find(
        {"user_id": {"$in": friend_ids}},
        {"user_id": 1, "first_name": 1, "last_name": 1, "avatar": 1, "_id": 0},
    ))
    return friends
