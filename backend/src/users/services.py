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
    collection.insert_one(user.model_dump())
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

    doc.pop("_id", None)
    return User(**doc)


@service
def verify_user_entry(user_id: str) -> bool:
    """
    Verifies that a specified user exists in the db instance.
    """
    collection = get_mongo_collection(settings.mongo_users_collection)
    return collection.find_one({"user_id": user_id}) is not None
