from asyncio import to_thread

from fastapi import APIRouter, HTTPException, Depends

from src.restaurants.models import (
    CreateVisitedEntryRequest,
    GetVisitedByUserRequest,
    DeleteVisitedEntryRequest,
    CreateVisitedEntryResponse,
    GetVisitedByUserResponse,
    DeleteVisitedEntryResponse,
)
from src.restaurants.services.visited_srv import VisitedService
from src.dependencies import get_visited_service
from src.utils.auth import get_current_user, enforce_owner

router = APIRouter()


# ==================== visited ==================== #

@router.post("")
async def create_visited(
    request: CreateVisitedEntryRequest,
    current_user: dict = Depends(get_current_user),
    visited: VisitedService = Depends(get_visited_service),
) -> CreateVisitedEntryResponse:
    """Endpoint to mark a restaurant as visited."""
    try:
        user_id = current_user["user_id"]
        entry_id = await to_thread(visited.create_visited_entry, request=request, user_id=user_id)
        return CreateVisitedEntryResponse(success=entry_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.post("/from-wishlist")
async def move_wishlist_to_visited(
    request: CreateVisitedEntryRequest,
    current_user: dict = Depends(get_current_user),
    visited: VisitedService = Depends(get_visited_service),
) -> CreateVisitedEntryResponse:
    """Moves a restaurant from wishlist to visited: creates visited entry and removes wishlist entry."""
    try:
        user_id = current_user["user_id"]
        entry_id = await to_thread(visited.move_wishlist_to_visited_entry, request=request, user_id=user_id)
        return CreateVisitedEntryResponse(success=entry_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/me")
async def get_visited(
    current_user: dict = Depends(get_current_user),
    visited: VisitedService = Depends(get_visited_service),
) -> GetVisitedByUserResponse:
    """Endpoint to get all visited entries for the current user."""
    try:
        user_id = current_user["user_id"]
        request = GetVisitedByUserRequest(user_id=user_id)
        entries = await to_thread(visited.get_visited_by_user, request=request)
        return GetVisitedByUserResponse(entries=entries)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/{entry_id}")
async def remove_visited_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
    visited: VisitedService = Depends(get_visited_service),
) -> DeleteVisitedEntryResponse:
    """Endpoint to delete a visited entry by ID."""
    try:
        entry = await to_thread(visited.get_visited_entry_by_id, entry_id=entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Visited entry not found.")
        enforce_owner(current_user, entry["user_id"])
        request = DeleteVisitedEntryRequest(entry_id=entry_id)
        success = await to_thread(visited.delete_visited_entry, request=request)
        return DeleteVisitedEntryResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
