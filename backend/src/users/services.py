from loguru import logger
from uuid import uuid4

from src.db.mongo_client import get_mongo_client
from src.utils.wrappers import service
from src.users.models import (
    User,
    CreateUserRequest
)
from src.config import settings


@service()
def get_all_users_from_db() -> list[dict]:
    """
    Service to get all users from the mongo db instance.
    """
    # get db client
    client = get_mongo_client(
        collection_name=settings.mongo_users_collection
    )
    # get all entries and clean up.
    users = list(client.collection.find({}))
    for user in users:
        assert isinstance(user, dict), "User data should be a dictionary."
        user.pop("_id", None)
    return users


@service()
def create_one_user(request: CreateUserRequest) -> bool:
    """
    Service to get all users from the mongo db instance.
    """
    # get db client
    client = get_mongo_client(collection_name="users")
    # generate entry and update
    user_instance = User(
        user_id=uuid4(), 
        **request.model_dump()
    )
    result = client.collection.update_one({}, {"$set": user_instance.model_dump()}, upsert=True)
    if result.matched_count == 0 and result.modified_count == 1:
        return True
    return False

@service()
def verify_user_entry(user_id: str) -> bool:
    """
    Verifies that a specified user exists in the db instance.
    """
    all_users = get_all_users_from_db()
    for user in all_users:
        if user.get("user_id") == user_id:
            return True
    else:
        return False
