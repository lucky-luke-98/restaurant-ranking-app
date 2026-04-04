from asyncio import to_thread

from fastapi import APIRouter, HTTPException, Depends, Request, Query

from src.restaurants.models import (
    CreateRestaurantRequest,
    CreateRestaurantReviewRequest,
    CreateFoodReviewRequest,
    CreateWishlistEntryRequest,
    CreateVisitedEntryRequest,
    UpdateRestaurantReviewRequest,
    UpdateFoodReviewRequest,
    GetRestaurantByIdRequest,
    GetReviewsByRestaurantRequest,
    GetFoodReviewsByRestaurantRequest,
    GetReviewedRestaurantIdsByUserRequest,
    GetWishlistByUserRequest,
    GetVisitedByUserRequest,
    DeleteRestaurantRequest,
    DeleteReviewRequest,
    DeleteFoodReviewRequest,
    DeleteWishlistEntryRequest,
    DeleteVisitedEntryRequest,
    CreateRestaurantResponse,
    SearchPlacesResponse,
    GetAllRestaurantsResponse,
    GetRestaurantByIdResponse,
    DeleteRestaurantResponse,
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
    CreateWishlistEntryResponse,
    GetWishlistByUserResponse,
    DeleteWishlistEntryResponse,
    CreateVisitedEntryResponse,
    GetVisitedByUserResponse,
    DeleteVisitedEntryResponse,
)
from src.restaurants.services import (
    search_places,
    create_one_restaurant,
    get_all_restaurants,
    get_restaurant_by_id,
    delete_restaurant,
    create_one_restaurant_review,
    get_reviews_by_restaurant,
    get_reviewed_restaurant_ids_by_user,
    get_review_by_id,
    update_restaurant_review,
    delete_review,
    create_food_review,
    get_food_reviews_by_restaurant,
    get_food_review_by_id,
    update_food_review,
    delete_food_review,
    get_images_by_review,
    get_images_by_food_review,
    get_food_review_stats,
    create_wishlist_entry,
    get_wishlist_by_user,
    get_wishlist_entry_by_id,
    delete_wishlist_entry,
    create_visited_entry,
    get_visited_by_user,
    get_visited_entry_by_id,
    delete_visited_entry,
    move_wishlist_to_visited_entry,
)
from src.utils.auth import get_current_user, enforce_owner
from src.utils.rate_limit import limiter

router = APIRouter()


# ==================== google places search ==================== #

@router.get("/search")
@limiter.limit("10/hour")
async def search_restaurants(
    request: Request,
    query: str,
    current_user: dict = Depends(get_current_user),
) -> SearchPlacesResponse:
    """Endpoint to search for restaurants via Google Places Autocomplete."""
    try:
        results = await to_thread(search_places, query=query)
        return SearchPlacesResponse(results=results)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== restaurants ==================== #

@router.post("")
async def create_restaurant(
    request: CreateRestaurantRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateRestaurantResponse:
    """Endpoint to create a restaurant from a Google Place ID."""
    try:
        user_id = current_user["user_id"]
        res_id = await to_thread(create_one_restaurant, request=request, user_id=user_id)
        if res_id:
            return CreateRestaurantResponse(restaurant_id=res_id, success=True)
        raise Exception("Error while creating one restaurant list entry.")
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("")
async def get_restaurants(
    current_user: dict = Depends(get_current_user),
) -> GetAllRestaurantsResponse:
    """Endpoint to get all restaurants."""
    try:
        restaurants = await to_thread(get_all_restaurants)
        return GetAllRestaurantsResponse(restaurants=restaurants)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


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


@router.get("/{restaurant_id}")
async def get_restaurant(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetRestaurantByIdResponse:
    """Endpoint to get a single restaurant by ID."""
    try:
        request = GetRestaurantByIdRequest(restaurant_id=restaurant_id)
        restaurant = await to_thread(get_restaurant_by_id, request=request)
        return GetRestaurantByIdResponse(restaurant=restaurant)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/{restaurant_id}")
async def remove_restaurant(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteRestaurantResponse:
    """Endpoint to delete a restaurant by ID."""
    try:
        restaurant = await to_thread(
            get_restaurant_by_id,
            request=GetRestaurantByIdRequest(restaurant_id=restaurant_id),
        )
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found.")
        if current_user.get("role") != "admin":
            enforce_owner(current_user, restaurant.get("created_by", ""))
        request = DeleteRestaurantRequest(restaurant_id=restaurant_id)
        success = await to_thread(delete_restaurant, request=request)
        return DeleteRestaurantResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== reviews ==================== #

@router.post("/reviews")
async def create_review(
    request: CreateRestaurantReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateRestaurantReviewResponse:
    """Endpoint to create a restaurant review."""
    try:
        user_id = current_user["user_id"]
        review_id = await to_thread(create_one_restaurant_review, request=request, user_id=user_id)
        return CreateRestaurantReviewResponse(success=review_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/reviews/{restaurant_id}")
async def get_reviews(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetReviewsByRestaurantResponse:
    """Endpoint to get all reviews for a restaurant."""
    try:
        request = GetReviewsByRestaurantRequest(restaurant_id=restaurant_id)
        reviews = await to_thread(get_reviews_by_restaurant, request=request)
        return GetReviewsByRestaurantResponse(reviews=reviews)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/reviews/user/me")
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


@router.put("/reviews")
async def update_review(
    request: UpdateRestaurantReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> UpdateRestaurantReviewResponse:
    """Endpoint to update a restaurant review."""
    try:
        review = await to_thread(get_review_by_id, review_id=request.review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")
        enforce_owner(current_user, review["user_id"])
        success = await to_thread(update_restaurant_review, request=request)
        return UpdateRestaurantReviewResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/reviews/{review_id}")
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


# ==================== food reviews ==================== #

@router.post("/reviews/food")
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


@router.get("/reviews/food/{restaurant_id}")
async def get_food_reviews(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetFoodReviewsByRestaurantResponse:
    """Endpoint to get all food reviews for a restaurant."""
    try:
        request = GetFoodReviewsByRestaurantRequest(restaurant_id=restaurant_id)
        food_reviews = await to_thread(get_food_reviews_by_restaurant, request=request)
        return GetFoodReviewsByRestaurantResponse(food_reviews=food_reviews)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.put("/reviews/food")
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


@router.delete("/reviews/food/{food_review_id}")
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

@router.get("/reviews/{review_id}/images")
async def get_review_images(
    review_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Endpoint to get all images for a restaurant review."""
    try:
        images = await to_thread(get_images_by_review, review_id=review_id)
        return {"images": images}
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== food review images ==================== #

@router.get("/reviews/food/{food_review_id}/images")
async def get_food_review_images(
    food_review_id: str,
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Endpoint to get all images for a food review."""
    try:
        images = await to_thread(get_images_by_food_review, food_review_id=food_review_id)
        return {"images": images}
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== wishlist ==================== #

@router.post("/wishlist")
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


@router.get("/wishlist/me")
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


@router.delete("/wishlist/{entry_id}")
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


# ==================== visited ==================== #

@router.post("/visited")
async def create_visited(
    request: CreateVisitedEntryRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateVisitedEntryResponse:
    """Endpoint to mark a restaurant as visited."""
    try:
        user_id = current_user["user_id"]
        entry_id = await to_thread(create_visited_entry, request=request, user_id=user_id)
        return CreateVisitedEntryResponse(success=entry_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.post("/visited/from-wishlist")
async def move_wishlist_to_visited(
    request: CreateVisitedEntryRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateVisitedEntryResponse:
    """Moves a restaurant from wishlist to visited: creates visited entry and removes wishlist entry."""
    try:
        user_id = current_user["user_id"]
        entry_id = await to_thread(move_wishlist_to_visited_entry, request=request, user_id=user_id)
        return CreateVisitedEntryResponse(success=entry_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/visited/me")
async def get_visited(
    current_user: dict = Depends(get_current_user),
) -> GetVisitedByUserResponse:
    """Endpoint to get all visited entries for the current user."""
    try:
        user_id = current_user["user_id"]
        request = GetVisitedByUserRequest(user_id=user_id)
        entries = await to_thread(get_visited_by_user, request=request)
        return GetVisitedByUserResponse(entries=entries)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/visited/{entry_id}")
async def remove_visited_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteVisitedEntryResponse:
    """Endpoint to delete a visited entry by ID."""
    try:
        entry = await to_thread(get_visited_entry_by_id, entry_id=entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Visited entry not found.")
        enforce_owner(current_user, entry["user_id"])
        request = DeleteVisitedEntryRequest(entry_id=entry_id)
        success = await to_thread(delete_visited_entry, request=request)
        return DeleteVisitedEntryResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
