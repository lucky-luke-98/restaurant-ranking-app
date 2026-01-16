from fastapi import APIRouter, HTTPException

from src.users.models import (
    GetAllUsersResponse,
    CreateUserRequest,
    CreateUserResponse
)
from src.users.services import (
    get_all_users_from_db,
    create_one_user
)


router = APIRouter()


@router.get("/")
def get_all_users() -> GetAllUsersResponse:
    """Endpoint to get all users."""
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
