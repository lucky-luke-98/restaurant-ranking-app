from asyncio import to_thread

from fastapi import APIRouter, HTTPException, Depends, Request
from slowapi.util import get_remote_address

from src.users.models import (
    GetAllUsersResponse,
    RegisterRequest,
    LoginRequest,
    AuthResponse,
    UpdateAvatarRequest,
    AddFriendRequest,
    SearchUsersResponse,
)
from src.users.services import (
    get_all_users_from_db,
    register_user,
    authenticate_user,
    update_user_avatar,
    search_users,
    add_friend,
    remove_friend,
    get_friends,
)
from src.utils.auth import create_access_token, get_current_user, require_admin
from src.utils.rate_limit import limiter

router = APIRouter()


@router.post("/register")
@limiter.limit("2/day", key_func=get_remote_address)
async def register(request: Request, data: RegisterRequest) -> AuthResponse:
    """Register a new user and return a JWT token."""
    try:
        user = await to_thread(register_user, request=data)
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
@limiter.limit("5/day", key_func=get_remote_address)
async def login(request: Request, data: LoginRequest) -> AuthResponse:
    """Authenticate and return a JWT token."""
    try:
        user = await to_thread(authenticate_user, request=data)
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
async def get_me(current_user: dict = Depends(get_current_user)) -> dict:
    """Return the currently authenticated user from the JWT."""
    from src.db.mongo_client import get_mongo_collection
    from src.config import settings

    def _fetch():
        collection = get_mongo_collection(settings.mongo_users_collection)
        doc: dict = collection.find_one({"user_id": current_user["user_id"]})
        if not doc:
            return None
        doc.pop("_id", None)
        doc.pop("password_hash", None)
        return doc

    doc = await to_thread(_fetch)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")
    return doc


@router.put("/me/avatar")
async def set_avatar(data: UpdateAvatarRequest, current_user: dict = Depends(get_current_user)):
    """Upload or update the current user's profile picture (base64 thumbnail)."""
    await to_thread(update_user_avatar, user_id=current_user["user_id"], avatar=data.avatar)
    return {"success": True}


@router.get("/search")
async def search(query: str, current_user: dict = Depends(get_current_user)) -> SearchUsersResponse:
    """Search users by name."""
    results = await to_thread(search_users, query=query, current_user_id=current_user["user_id"])
    return SearchUsersResponse(users=results)


@router.get("/friends")
async def list_friends(current_user: dict = Depends(get_current_user)) -> dict:
    """Get current user's friends list."""
    friends = await to_thread(get_friends, user_id=current_user["user_id"])
    return {"friends": friends}


@router.post("/friends")
async def add_friend_endpoint(data: AddFriendRequest, current_user: dict = Depends(get_current_user)):
    """Add a friend connection."""
    await to_thread(add_friend, user_id=current_user["user_id"], friend_user_id=data.friend_user_id)
    return {"success": True}


@router.delete("/friends/{friend_user_id}")
async def remove_friend_endpoint(friend_user_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a friend connection."""
    await to_thread(remove_friend, user_id=current_user["user_id"], friend_user_id=friend_user_id)
    return {"success": True}


@router.get("/")
async def get_all_users(current_user: dict = Depends(require_admin)) -> GetAllUsersResponse:
    """Endpoint to get all users. Requires admin role."""
    try:
        all_users = await to_thread(get_all_users_from_db)
        return GetAllUsersResponse(
            all_users=all_users
        )
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
