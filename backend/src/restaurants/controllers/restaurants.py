from asyncio import to_thread

from fastapi import APIRouter, HTTPException, Depends, Request

from src.restaurants.models import (
    CreateRestaurantRequest,
    GetRestaurantByIdRequest,
    DeleteRestaurantRequest,
    CreateRestaurantResponse,
    SearchPlacesResponse,
    GetAllRestaurantsResponse,
    GetRestaurantByIdResponse,
    DeleteRestaurantResponse,
)
from src.restaurants.services.restaurants_srv import (
    search_places,
    create_one_restaurant,
    get_all_restaurants,
    get_restaurant_by_id,
    delete_restaurant,
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
    _: dict = Depends(get_current_user),
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
    _: dict = Depends(get_current_user),
) -> GetAllRestaurantsResponse:
    """Endpoint to get all restaurants."""
    try:
        restaurants = await to_thread(get_all_restaurants)
        return GetAllRestaurantsResponse(restaurants=restaurants)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/{restaurant_id}")
async def get_restaurant(
    restaurant_id: str,
    _: dict = Depends(get_current_user),
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
