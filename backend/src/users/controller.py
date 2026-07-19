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
from src.users.services import UserService, FriendService
from src.dependencies import get_user_service, get_friend_service
from src.utils.auth import create_access_token, get_current_user, require_admin
from src.utils.rate_limit import limiter

router = APIRouter()


@router.post("/register")
@limiter.limit("2/day", key_func=get_remote_address)
async def register(
    request: Request,
    data: RegisterRequest,
    users: UserService = Depends(get_user_service),
) -> AuthResponse:
    """Register a new user and return a JWT token."""
    try:
        user = await to_thread(users.register_user, request=data)
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
async def login(
    request: Request,
    data: LoginRequest,
    users: UserService = Depends(get_user_service),
) -> AuthResponse:
    """Authenticate and return a JWT token."""
    try:
        user = await to_thread(users.authenticate_user, request=data)
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
async def get_me(
    current_user: dict = Depends(get_current_user),
    users: UserService = Depends(get_user_service),
) -> dict:
    """Return the currently authenticated user from the JWT."""
    doc = await to_thread(users.get_me, current_user["user_id"])
    if not doc:
        raise HTTPException(status_code=404, detail="User not found.")
    return doc


@router.put("/me/avatar")
async def set_avatar(
    data: UpdateAvatarRequest,
    current_user: dict = Depends(get_current_user),
    users: UserService = Depends(get_user_service),
):
    """Upload or update the current user's profile picture (base64 thumbnail)."""
    await to_thread(users.update_user_avatar, user_id=current_user["user_id"], avatar=data.avatar)
    return {"success": True}


@router.get("/search")
async def search(
    query: str,
    current_user: dict = Depends(get_current_user),
    users: UserService = Depends(get_user_service),
) -> SearchUsersResponse:
    """Search users by name."""
    results = await to_thread(users.search_users, query=query, current_user_id=current_user["user_id"])
    return SearchUsersResponse(users=results)


@router.get("/friends")
async def list_friends(
    current_user: dict = Depends(get_current_user),
    friends: FriendService = Depends(get_friend_service),
) -> dict:
    """Get current user's friends list."""
    result = await to_thread(friends.get_friends, user_id=current_user["user_id"])
    return {"friends": result}


@router.post("/friends")
async def send_friend_request_endpoint(
    data: AddFriendRequest,
    current_user: dict = Depends(get_current_user),
    friends: FriendService = Depends(get_friend_service),
):
    """Send a friend request. Auto-accepts if the recipient had already requested the sender."""
    try:
        status = await to_thread(
            friends.send_friend_request,
            user_id=current_user["user_id"],
            friend_user_id=data.friend_user_id,
        )
    except ValueError as exp:
        raise HTTPException(status_code=400, detail=str(exp))
    return {"success": True, "status": status}


@router.delete("/friends/{friend_user_id}")
async def remove_friend_endpoint(
    friend_user_id: str,
    current_user: dict = Depends(get_current_user),
    friends: FriendService = Depends(get_friend_service),
):
    """Remove a friend connection."""
    await to_thread(friends.remove_friend, user_id=current_user["user_id"], friend_user_id=friend_user_id)
    return {"success": True}


@router.get("/friends/requests/incoming")
async def list_incoming_requests(
    current_user: dict = Depends(get_current_user),
    friends: FriendService = Depends(get_friend_service),
) -> dict:
    """Users who have requested to befriend the current user."""
    users = await to_thread(friends.get_incoming_friend_requests, user_id=current_user["user_id"])
    return {"requests": users}


@router.get("/friends/requests/outgoing")
async def list_outgoing_requests(
    current_user: dict = Depends(get_current_user),
    friends: FriendService = Depends(get_friend_service),
) -> dict:
    """Users the current user has sent pending friend requests to."""
    users = await to_thread(friends.get_outgoing_friend_requests, user_id=current_user["user_id"])
    return {"requests": users}


@router.post("/friends/requests/{requester_user_id}/accept")
async def accept_friend_request_endpoint(
    requester_user_id: str,
    current_user: dict = Depends(get_current_user),
    friends: FriendService = Depends(get_friend_service),
):
    """Accept an incoming pending friend request."""
    try:
        await to_thread(
            friends.accept_friend_request,
            user_id=current_user["user_id"],
            requester_user_id=requester_user_id,
        )
    except ValueError as exp:
        raise HTTPException(status_code=404, detail=str(exp))
    return {"success": True}


@router.post("/friends/requests/{requester_user_id}/decline")
async def decline_friend_request_endpoint(
    requester_user_id: str,
    current_user: dict = Depends(get_current_user),
    friends: FriendService = Depends(get_friend_service),
):
    """Decline an incoming pending friend request."""
    await to_thread(
        friends.decline_friend_request,
        user_id=current_user["user_id"],
        requester_user_id=requester_user_id,
    )
    return {"success": True}


@router.delete("/friends/requests/{recipient_user_id}")
async def cancel_friend_request_endpoint(
    recipient_user_id: str,
    current_user: dict = Depends(get_current_user),
    friends: FriendService = Depends(get_friend_service),
):
    """Cancel an outgoing pending friend request."""
    await to_thread(
        friends.cancel_friend_request,
        user_id=current_user["user_id"],
        recipient_user_id=recipient_user_id,
    )
    return {"success": True}


@router.get("/")
async def get_all_users(
    current_user: dict = Depends(require_admin),
    users: UserService = Depends(get_user_service),
) -> GetAllUsersResponse:
    """Endpoint to get all users. Requires admin role."""
    try:
        all_users = await to_thread(users.get_all_users)
        return GetAllUsersResponse(all_users=all_users)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
