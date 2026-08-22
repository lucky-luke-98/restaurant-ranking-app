from asyncio import to_thread

from fastapi import APIRouter, HTTPException, Depends, Request

from src.restaurants.models import (
    CreateRestaurantRequest,
    CreateManualRestaurantRequest,
    GetRestaurantByIdRequest,
    DeleteRestaurantRequest,
    UpdateRestaurantTagsRequest,
    UpdateRestaurantTagsResponse,
    ListTagsResponse,
    CreateRestaurantResponse,
    SearchPlacesResponse,
    GetAllRestaurantsResponse,
    GetRestaurantByIdResponse,
    DeleteRestaurantResponse,
)
from src.restaurants.services.restaurants_srv import RestaurantService, TagNotAllowedError
from src.restaurants.gateways import GooglePlacesError, AddressNotFoundError
from src.dependencies import get_restaurant_service
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
    restaurants: RestaurantService = Depends(get_restaurant_service),
) -> SearchPlacesResponse:
    """Endpoint to search for restaurants via Google Places Autocomplete."""
    try:
        results = await to_thread(restaurants.search_places, query=query)
        return SearchPlacesResponse(results=results)
    except GooglePlacesError as exp:
        raise HTTPException(status_code=502, detail=str(exp))
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== tags ==================== #

@router.get("/tags")
async def list_tags(
    _: dict = Depends(get_current_user),
    restaurants: RestaurantService = Depends(get_restaurant_service),
) -> ListTagsResponse:
    """Endpoint to list every selectable tag. Declared before /{restaurant_id} so the
    literal path wins over the path parameter."""
    try:
        return ListTagsResponse(tags=await to_thread(restaurants.list_tags))
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


# ==================== restaurants ==================== #

@router.post("")
async def create_restaurant(
    request: CreateRestaurantRequest,
    current_user: dict = Depends(get_current_user),
    restaurants: RestaurantService = Depends(get_restaurant_service),
) -> CreateRestaurantResponse:
    """Endpoint to create a restaurant from a Google Place ID."""
    try:
        user_id = current_user["user_id"]
        res_id = await to_thread(
            restaurants.create_one_restaurant,
            request=request,
            user_id=user_id,
            is_admin=current_user.get("role") == "admin",
        )
        if res_id:
            return CreateRestaurantResponse(restaurant_id=res_id, success=True)
        raise Exception("Error while creating one restaurant list entry.")
    except TagNotAllowedError as exp:
        raise HTTPException(status_code=403, detail=str(exp))
    except GooglePlacesError as exp:
        raise HTTPException(status_code=502, detail=str(exp))
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.post("/manual")
@limiter.limit("10/hour")
async def create_manual_restaurant(
    request: Request,
    body: CreateManualRestaurantRequest,
    current_user: dict = Depends(get_current_user),
    restaurants: RestaurantService = Depends(get_restaurant_service),
) -> CreateRestaurantResponse:
    """Endpoint to create a restaurant from a name + dropped map pin, reverse-geocoded via Nominatim."""
    try:
        user_id = current_user["user_id"]
        res_id = await to_thread(
            restaurants.create_manual_restaurant,
            request=body,
            user_id=user_id,
            is_admin=current_user.get("role") == "admin",
        )
        return CreateRestaurantResponse(restaurant_id=res_id, success=True)
    except TagNotAllowedError as exp:
        raise HTTPException(status_code=403, detail=str(exp))
    except AddressNotFoundError as exp:
        raise HTTPException(status_code=422, detail=str(exp))
    except GooglePlacesError as exp:
        raise HTTPException(status_code=502, detail=str(exp))
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("")
async def get_restaurants(
    _: dict = Depends(get_current_user),
    restaurants: RestaurantService = Depends(get_restaurant_service),
) -> GetAllRestaurantsResponse:
    """Endpoint to get all restaurants."""
    try:
        result = await to_thread(restaurants.get_all_restaurants)
        return GetAllRestaurantsResponse(restaurants=result)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.get("/{restaurant_id}")
async def get_restaurant(
    restaurant_id: str,
    _: dict = Depends(get_current_user),
    restaurants: RestaurantService = Depends(get_restaurant_service),
) -> GetRestaurantByIdResponse:
    """Endpoint to get a single restaurant by ID."""
    try:
        request = GetRestaurantByIdRequest(restaurant_id=restaurant_id)
        restaurant = await to_thread(restaurants.get_restaurant_by_id, request=request)
        return GetRestaurantByIdResponse(restaurant=restaurant)
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.patch("/{restaurant_id}/tags")
async def update_restaurant_tags(
    restaurant_id: str,
    body: UpdateRestaurantTagsRequest,
    current_user: dict = Depends(get_current_user),
    restaurants: RestaurantService = Depends(get_restaurant_service),
) -> UpdateRestaurantTagsResponse:
    """Endpoint to add and/or remove tags on a restaurant.

    Anyone may add a tag; only the restaurant's creator or an admin may remove one,
    so a shared taxonomy stays collaborative without letting one user erase another's.
    """
    try:
        restaurant = await to_thread(
            restaurants.get_restaurant_by_id,
            request=GetRestaurantByIdRequest(restaurant_id=restaurant_id),
        )
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found.")
        is_admin = current_user.get("role") == "admin"
        if body.remove and not is_admin:
            enforce_owner(current_user, restaurant.get("created_by", ""))
        tags = await to_thread(
            restaurants.update_tags, restaurant_id=restaurant_id, request=body, is_admin=is_admin
        )
        return UpdateRestaurantTagsResponse(tags=tags, success=True)
    except HTTPException:
        raise
    except TagNotAllowedError as exp:
        raise HTTPException(status_code=403, detail=str(exp))
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))


@router.delete("/{restaurant_id}")
async def remove_restaurant(
    restaurant_id: str,
    current_user: dict = Depends(get_current_user),
    restaurants: RestaurantService = Depends(get_restaurant_service),
) -> DeleteRestaurantResponse:
    """Endpoint to delete a restaurant by ID."""
    try:
        restaurant = await to_thread(
            restaurants.get_restaurant_by_id,
            request=GetRestaurantByIdRequest(restaurant_id=restaurant_id),
        )
        if not restaurant:
            raise HTTPException(status_code=404, detail="Restaurant not found.")
        if current_user.get("role") != "admin":
            enforce_owner(current_user, restaurant.get("created_by", ""))
        request = DeleteRestaurantRequest(restaurant_id=restaurant_id)
        success = await to_thread(restaurants.delete_restaurant, request=request)
        return DeleteRestaurantResponse(success=success)
    except HTTPException:
        raise
    except Exception as exp:
        raise HTTPException(status_code=500, detail=str(exp))
