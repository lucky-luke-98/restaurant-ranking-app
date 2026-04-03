from fastapi import APIRouter, HTTPException, Depends

from src.users.models import (
    GetAllUsersResponse,
    CreateUserRequest,
    CreateUserResponse,
    RegisterRequest,
    LoginRequest,
    AuthResponse,
)
from src.users.services import (
    get_all_users_from_db,
    create_one_user,
    register_user,
    authenticate_user,
)
from src.utils.auth import create_access_token, get_current_user, require_admin


router = APIRouter()


@router.post("/register")
def register(request: RegisterRequest) -> AuthResponse:
    """Register a new user and return a JWT token."""
    try:
        user = register_user(request=request)
    except ValueError as exp:
        raise HTTPException(status_code=409, detail=str(exp))
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))

    token = create_access_token({
        "user_id": user.user_id,
        "mail": user.mail,
        "role": user.role,
    })
    return AuthResponse(
        access_token=token,
        user_id=user.user_id,
        mail=user.mail,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
    )


@router.post("/login")
def login(request: LoginRequest) -> AuthResponse:
    """Authenticate and return a JWT token."""
    try:
        user = authenticate_user(request=request)
    except ValueError as exp:
        raise HTTPException(status_code=401, detail=str(exp))
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))

    token = create_access_token({
        "user_id": user.user_id,
        "mail": user.mail,
        "role": user.role,
    })
    return AuthResponse(
        access_token=token,
        user_id=user.user_id,
        mail=user.mail,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
    )


@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)) -> dict:
    """Return the currently authenticated user from the JWT."""
    from src.db.mongo_client import get_mongo_collection
    from src.config import settings

    collection = get_mongo_collection(settings.mongo_users_collection)
    doc: dict = collection.find_one({"user_id": current_user["user_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


@router.get("/")
def get_all_users(current_user: dict = Depends(require_admin)) -> GetAllUsersResponse:
    """Endpoint to get all users. Requires admin role."""
    try:
        all_users = get_all_users_from_db()
        return GetAllUsersResponse(
            all_users=all_users
        )
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.post("/")
def create_user(user_data: CreateUserRequest) -> CreateUserResponse:
    """Endpoint to set a new user in the database."""
    try:
        success = create_one_user(request=user_data)
        return CreateUserResponse(
            success=success
        )
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
