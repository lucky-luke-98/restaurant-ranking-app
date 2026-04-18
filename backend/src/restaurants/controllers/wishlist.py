from asyncio import to_thread

from fastapi import APIRouter, HTTPException, Depends

from src.restaurants.models import (
    CreateWishlistEntryRequest,
    UpdateWishlistEntryRequest,
    GetWishlistByUserRequest,
    DeleteWishlistEntryRequest,
    CreateWishlistEntryResponse,
    GetWishlistByUserResponse,
    UpdateWishlistEntryResponse,
    DeleteWishlistEntryResponse,
)
from src.restaurants.services.wishlist_srv import (
    create_wishlist_entry,
    get_wishlist_by_user,
    get_wishlist_entry_by_id,
    update_wishlist_entry,
    delete_wishlist_entry,
)
from src.utils.auth import get_current_user, enforce_owner

router = APIRouter()


# ==================== wishlist ==================== #

@router.post("")
async def create_wishlist(
    request: CreateWishlistEntryRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateWishlistEntryResponse:
    """Endpoint to create a wishlist entry."""
    try:
        user_id = current_user["user_id"]
        entry_id = await to_thread(create_wishlist_entry, request=request, user_id=user_id)
        return CreateWishlistEntryResponse(success=entry_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/me")
async def get_wishlist(
    current_user: dict = Depends(get_current_user),
) -> GetWishlistByUserResponse:
    """Endpoint to get all wishlist entries for the current user."""
    try:
        user_id = current_user["user_id"]
        request = GetWishlistByUserRequest(user_id=user_id)
        entries = await to_thread(get_wishlist_by_user, request=request)
        return GetWishlistByUserResponse(entries=entries)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.put("")
async def update_wishlist(
    request: UpdateWishlistEntryRequest,
    current_user: dict = Depends(get_current_user),
) -> UpdateWishlistEntryResponse:
    """Endpoint to update the comment on a wishlist entry. Owner only."""
    try:
        entry = await to_thread(get_wishlist_entry_by_id, entry_id=request.entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Wishlist entry not found.")
        enforce_owner(current_user, entry["user_id"])
        success = await to_thread(update_wishlist_entry, request=request)
        return UpdateWishlistEntryResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/{entry_id}")
async def remove_wishlist_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteWishlistEntryResponse:
    """Endpoint to delete a wishlist entry by ID."""
    try:
        entry = await to_thread(get_wishlist_entry_by_id, entry_id=entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Wishlist entry not found.")
        enforce_owner(current_user, entry["user_id"])
        request = DeleteWishlistEntryRequest(entry_id=entry_id)
        success = await to_thread(delete_wishlist_entry, request=request)
        return DeleteWishlistEntryResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
