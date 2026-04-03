from fastapi import APIRouter, HTTPException, Depends

from src.restaurants.models import (
    CreateRestaurantRequest,
    CreateRestaurantReviewRequest,
    CreateFoodReviewRequest,
    CreateWishlistEntryRequest,
    CreateVisitedEntryRequest,
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
    GetReviewsByRestaurantResponse,
    GetReviewedRestaurantIdsByUserResponse,
    DeleteReviewResponse,
    CreateFoodReviewResponse,
    GetFoodReviewsByRestaurantResponse,
    DeleteFoodReviewResponse,
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
    delete_review,
    create_food_review,
    get_food_reviews_by_restaurant,
    get_food_review_by_id,
    delete_food_review,
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


router = APIRouter()


# ==================== google places search ==================== #

@router.get("/search")
def search_restaurants(
    query: str,
    current_user: dict = Depends(get_current_user),
) -> SearchPlacesResponse:
    """Endpoint to search for restaurants via Google Places Autocomplete."""
    try:
        results = search_places(query=query)
        return SearchPlacesResponse(results=results)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== restaurants ==================== #

@router.post("")
def create_restaurant(
    request: CreateRestaurantRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateRestaurantResponse:
    """Endpoint to create a restaurant from a Google Place ID."""
    try:
        res_id = create_one_restaurant(request=request)
        if res_id:
            return CreateRestaurantResponse(restaurant_id=res_id, success=True)
        raise Exception("Error while creating one restaurant list entry.")
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("")
def get_restaurants(
    current_user: dict = Depends(get_current_user),
) -> GetAllRestaurantsResponse:
    """Endpoint to get all restaurants."""
    try:
        restaurants = get_all_restaurants()
        return GetAllRestaurantsResponse(restaurants=restaurants)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/{restaurant_id}")
def get_restaurant(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetRestaurantByIdResponse:
    """Endpoint to get a single restaurant by ID."""
    try:
        request = GetRestaurantByIdRequest(restaurant_id=restaurant_id)
        restaurant = get_restaurant_by_id(request=request)
        return GetRestaurantByIdResponse(restaurant=restaurant)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/{restaurant_id}")
def remove_restaurant(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteRestaurantResponse:
    """Endpoint to delete a restaurant by ID."""
    try:
        request = DeleteRestaurantRequest(restaurant_id=restaurant_id)
        success = delete_restaurant(request=request)
        return DeleteRestaurantResponse(success=success)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== reviews ==================== #

@router.post("/reviews")
def create_review(
    request: CreateRestaurantReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateRestaurantReviewResponse:
    """Endpoint to create a restaurant review."""
    try:
        enforce_owner(current_user, request.user_id)
        review_id = create_one_restaurant_review(request=request)
        return CreateRestaurantReviewResponse(success=review_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/reviews/{restaurant_id}")
def get_reviews(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetReviewsByRestaurantResponse:
    """Endpoint to get all reviews for a restaurant."""
    try:
        request = GetReviewsByRestaurantRequest(restaurant_id=restaurant_id)
        reviews = get_reviews_by_restaurant(request=request)
        return GetReviewsByRestaurantResponse(reviews=reviews)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/reviews/user/{user_id}")
def get_reviewed_restaurants(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetReviewedRestaurantIdsByUserResponse:
    """Endpoint to get all restaurant IDs that a user has reviewed."""
    try:
        enforce_owner(current_user, user_id)
        request = GetReviewedRestaurantIdsByUserRequest(user_id=user_id)
        restaurant_ids = get_reviewed_restaurant_ids_by_user(request=request)
        return GetReviewedRestaurantIdsByUserResponse(restaurant_ids=restaurant_ids)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/reviews/{review_id}")
def remove_review(
    review_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteReviewResponse:
    """Endpoint to delete a review by ID."""
    try:
        review = get_review_by_id(review_id=review_id)
        if not review:
            raise HTTPException(status_code=404, detail="Review not found.")
        enforce_owner(current_user, review["user_id"])
        request = DeleteReviewRequest(review_id=review_id)
        success = delete_review(request=request)
        return DeleteReviewResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== food reviews ==================== #

@router.post("/reviews/food")
def create_food_review_entry(
    request: CreateFoodReviewRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateFoodReviewResponse:
    """Endpoint to create a food review."""
    try:
        enforce_owner(current_user, request.user_id)
        food_review_id = create_food_review(request=request)
        return CreateFoodReviewResponse(success=food_review_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/reviews/food/{restaurant_id}")
def get_food_reviews(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetFoodReviewsByRestaurantResponse:
    """Endpoint to get all food reviews for a restaurant."""
    try:
        request = GetFoodReviewsByRestaurantRequest(restaurant_id=restaurant_id)
        food_reviews = get_food_reviews_by_restaurant(request=request)
        return GetFoodReviewsByRestaurantResponse(food_reviews=food_reviews)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/reviews/food/{food_review_id}")
def remove_food_review(
    food_review_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteFoodReviewResponse:
    """Endpoint to delete a food review by ID."""
    try:
        food_review = get_food_review_by_id(food_review_id=food_review_id)
        if not food_review:
            raise HTTPException(status_code=404, detail="Food review not found.")
        enforce_owner(current_user, food_review["user_id"])
        request = DeleteFoodReviewRequest(food_review_id=food_review_id)
        success = delete_food_review(request=request)
        return DeleteFoodReviewResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== wishlist ==================== #

@router.post("/wishlist")
def create_wishlist(
    request: CreateWishlistEntryRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateWishlistEntryResponse:
    """Endpoint to create a wishlist entry."""
    try:
        enforce_owner(current_user, request.user_id)
        entry_id = create_wishlist_entry(request=request)
        return CreateWishlistEntryResponse(success=entry_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/wishlist/{user_id}")
def get_wishlist(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetWishlistByUserResponse:
    """Endpoint to get all wishlist entries for a user."""
    try:
        enforce_owner(current_user, user_id)
        request = GetWishlistByUserRequest(user_id=user_id)
        entries = get_wishlist_by_user(request=request)
        return GetWishlistByUserResponse(entries=entries)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/wishlist/{entry_id}")
def remove_wishlist_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteWishlistEntryResponse:
    """Endpoint to delete a wishlist entry by ID."""
    try:
        entry = get_wishlist_entry_by_id(entry_id=entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Wishlist entry not found.")
        enforce_owner(current_user, entry["user_id"])
        request = DeleteWishlistEntryRequest(entry_id=entry_id)
        success = delete_wishlist_entry(request=request)
        return DeleteWishlistEntryResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== visited ==================== #

@router.post("/visited")
def create_visited(
    request: CreateVisitedEntryRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateVisitedEntryResponse:
    """Endpoint to mark a restaurant as visited."""
    try:
        enforce_owner(current_user, request.user_id)
        entry_id = create_visited_entry(request=request)
        return CreateVisitedEntryResponse(success=entry_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.post("/visited/from-wishlist")
def move_wishlist_to_visited(
    request: CreateVisitedEntryRequest,
    current_user: dict = Depends(get_current_user),
) -> CreateVisitedEntryResponse:
    """Moves a restaurant from wishlist to visited: creates visited entry and removes wishlist entry."""
    try:
        enforce_owner(current_user, request.user_id)
        entry_id = move_wishlist_to_visited_entry(request=request)
        return CreateVisitedEntryResponse(success=entry_id is not None)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/visited/{user_id}")
def get_visited(
    user_id: str,
    current_user: dict = Depends(get_current_user),
) -> GetVisitedByUserResponse:
    """Endpoint to get all visited entries for a user."""
    try:
        enforce_owner(current_user, user_id)
        request = GetVisitedByUserRequest(user_id=user_id)
        entries = get_visited_by_user(request=request)
        return GetVisitedByUserResponse(entries=entries)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/visited/{entry_id}")
def remove_visited_entry(
    entry_id: str,
    current_user: dict = Depends(get_current_user),
) -> DeleteVisitedEntryResponse:
    """Endpoint to delete a visited entry by ID."""
    try:
        entry = get_visited_entry_by_id(entry_id=entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail="Visited entry not found.")
        enforce_owner(current_user, entry["user_id"])
        request = DeleteVisitedEntryRequest(entry_id=entry_id)
        success = delete_visited_entry(request=request)
        return DeleteVisitedEntryResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
