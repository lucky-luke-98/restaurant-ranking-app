from asyncio import to_thread

from fastapi import APIRouter, HTTPException, Depends, Query

from src.restaurants.models import (
    CreateRestaurantReviewRequest,
    UpdateRestaurantReviewRequest,
    GetReviewsByRestaurantRequest,
    GetReviewedRestaurantIdsByUserRequest,
    DeleteReviewRequest,
    CreateFoodReviewRequest,
    UpdateFoodReviewRequest,
    GetFoodReviewsByRestaurantRequest,
    DeleteFoodReviewRequest,
    CreateRestaurantReviewResponse,
    UpdateRestaurantReviewResponse,
    GetReviewsByRestaurantResponse,
    GetReviewedRestaurantIdsByUserResponse,
    DeleteReviewResponse,
    CreateFoodReviewResponse,
    UpdateFoodReviewResponse,
    GetFoodReviewsByRestaurantResponse,
    DeleteFoodReviewResponse,
    GetFoodReviewStatsResponse,
    FoodReviewStatsEntry,
    LeaveReviewResponse,
    GetFriendsFeedResponse,
)
from src.restaurants.services.reviews_srv import (
    create_one_restaurant_review,
    get_reviews_by_restaurant,
    get_reviewed_restaurant_ids_by_user,
    get_review_by_id,
    update_restaurant_review,
    delete_review,
    leave_review,
    create_food_review,
    get_food_reviews_by_restaurant,
    get_food_review_by_id,
    update_food_review,
    delete_food_review,
    get_images_by_review,
    get_images_by_food_review,
    get_food_review_stats,
    get_friends_feed,
)
from src.utils.auth import get_current_user, enforce_owner, enforce_owner_or_coauthor

router = APIRouter()


# ==================== food review stats ==================== #

@router.get("/food-review-stats")
async def get_food_reviews_stats(
    restaurant_ids: list[str] = Query(...),
    current_user: dict = Depends(get_current_user),
) -> GetFoodReviewStatsResponse:
    """Endpoint to get food review count, average rating, and user's last visited date."""
    try:
        user_id = current_user["user_id"]
        stats = await to_thread(get_food_review_stats, restaurant_ids=restaurant_ids, user_id=user_id)
        return GetFoodReviewStatsResponse(
            stats=[FoodReviewStatsEntry(**s) for s in stats]
        )
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== friends feed ==================== #

@router.get("/feed/friends")
async def get_friends_feed_endpoint(
    cursor: str | None = Query(None),
    cursor_id: str | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
) -> GetFriendsFeedResponse:
    """Endpoint to get a reverse-chronological feed of reviews by the user's friends."""
    try:
        user_id = current_user["user_id"]
        items, has_more = await to_thread(
            get_friends_feed,
            user_id=user_id,
            cursor_created_at=cursor,
            cursor_review_id=cursor_id,
            limit=limit,
        )
        next_cursor = items[-1]["created_at"] if has_more and items else None
        next_cursor_id = items[-1]["review_id"] if has_more and items else None
        return GetFriendsFeedResponse(
            items=items,
            next_cursor=next_cursor,
            next_cursor_id=next_cursor_id,
            has_more=has_more,
        )
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== reviews ==================== #

@router.post("")
async def create_review(
    request: CreateRestaurantReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateRestaurantReviewResponse:
    """Endpoint to create a restaurant review."""
    try:
        user_id = current_user["user_id"]
        review_id = await to_thread(create_one_restaurant_review, request=request, user_id=user_id)
        return CreateRestaurantReviewResponse(success=review_id is not None, review_id=review_id)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/{restaurant_id}")
async def get_reviews(
    restaurant_id: str,
    _: dict = Depends(get_current_user),
) -> GetReviewsByRestaurantResponse:
    """Endpoint to get all reviews for a restaurant."""
    try:
        request = GetReviewsByRestaurantRequest(restaurant_id=restaurant_id)
        reviews = await to_thread(get_reviews_by_restaurant, request=request)
        return GetReviewsByRestaurantResponse(reviews=reviews)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# NOT USED / FUTURE
@router.get("/user/me")
async def get_reviewed_restaurants(
    current_user: dict = Depends(get_current_user),
) -> GetReviewedRestaurantIdsByUserResponse:
    """Endpoint to get all restaurant IDs that the current user has reviewed."""
    try:
        user_id = current_user["user_id"]
        request = GetReviewedRestaurantIdsByUserRequest(user_id=user_id)
        restaurant_ids = await to_thread(get_reviewed_restaurant_ids_by_user, request=request)
        return GetReviewedRestaurantIdsByUserResponse(restaurant_ids=restaurant_ids)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.put("")
async def update_review(
    request: UpdateRestaurantReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> UpdateRestaurantReviewResponse:
    """Endpoint to update a restaurant review. Owner and coauthors may edit."""
    try:
        review = await to_thread(get_review_by_id, review_id=request.review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")
        enforce_owner_or_coauthor(current_user, review)
        success = await to_thread(update_restaurant_review, request=request)
        return UpdateRestaurantReviewResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/{review_id}")
async def remove_review(
    review_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteReviewResponse:
    """Endpoint to delete a review by ID."""
    try:
        review = await to_thread(get_review_by_id, review_id=review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")
        enforce_owner(current_user, review["user_id"])
        request = DeleteReviewRequest(review_id=review_id)
        success = await to_thread(delete_review, request=request)
        return DeleteReviewResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.post("/{review_id}/leave")
async def leave_review_endpoint(
    review_id: str,
    current_user: dict = Depends(get_current_user),
) -> LeaveReviewResponse:
    """Endpoint for a coauthor to remove themselves from a review."""
    try:
        review = await to_thread(get_review_by_id, review_id=review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")
        user_id = current_user["user_id"]
        if user_id not in review.get("coauthor_ids", []):
            raise HTTPException(status_code=403, detail="You are not a coauthor of this review.")
        success = await to_thread(leave_review, review_id=review_id, user_id=user_id)
        return LeaveReviewResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== food reviews ==================== #

@router.post("/food")
async def create_food_review_entry(
    request: CreateFoodReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateFoodReviewResponse:
    """Endpoint to create a food review."""
    try:
        user_id = current_user["user_id"]
        food_review_id = await to_thread(create_food_review, request=request, user_id=user_id)
        return CreateFoodReviewResponse(success=food_review_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/food/{restaurant_id}")
async def get_food_reviews(
    restaurant_id: str,
    _: dict = Depends(get_current_user),
) -> GetFoodReviewsByRestaurantResponse:
    """Endpoint to get all food reviews for a restaurant."""
    try:
        request = GetFoodReviewsByRestaurantRequest(restaurant_id=restaurant_id)
        food_reviews = await to_thread(get_food_reviews_by_restaurant, request=request)
        return GetFoodReviewsByRestaurantResponse(food_reviews=food_reviews)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.put("/food")
async def update_food_review_entry(
    request: UpdateFoodReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> UpdateFoodReviewResponse:
    """Endpoint to update a food review."""
    try:
        food_review = await to_thread(get_food_review_by_id, food_review_id=request.food_review_id)
        if not food_review:
            raise HTTPException(status_code=404, detail="Food review not found.")
        enforce_owner(current_user, food_review["user_id"])
        success = await to_thread(update_food_review, request=request)
        return UpdateFoodReviewResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/food/{food_review_id}")
async def remove_food_review(
    food_review_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteFoodReviewResponse:
    """Endpoint to delete a food review by ID (also deletes associated images)."""
    try:
        food_review = await to_thread(get_food_review_by_id, food_review_id=food_review_id)
        if not food_review:
            raise HTTPException(status_code=404, detail="Food review not found.")
        enforce_owner(current_user, food_review["user_id"])
        request = DeleteFoodReviewRequest(food_review_id=food_review_id)
        success = await to_thread(delete_food_review, request=request)
        return DeleteFoodReviewResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== review images ==================== #

@router.get("/{review_id}/images")
async def get_review_images(
    review_id: str,
    _: dict = Depends(get_current_user),
) -> dict:
    """Endpoint to get all images for a restaurant review."""
    try:
        images = await to_thread(get_images_by_review, review_id=review_id)
        return {"images": images}
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# NOT USED / FUTURE
@router.get("/food/{food_review_id}/images")
async def get_food_review_images(
    food_review_id: str,
    _: dict = Depends(get_current_user),
) -> dict:
    """Endpoint to get all images for a food review."""
    try:
        images = await to_thread(get_images_by_food_review, food_review_id=food_review_id)
        return {"images": images}
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
