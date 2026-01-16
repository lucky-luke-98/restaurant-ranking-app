from fastapi import APIRouter, HTTPException

from src.restaurants.models import (
    CreateRestaurantRequest,
    CreateRestaurantReviewRequest,
    CreateRestaurantResponse,
    CreateRestaurantReviewResponse
)
from src.restaurants.services import (
    create_one_restaurant,
    create_one_restaurant_review
)


router = APIRouter()


@router.post("/")
def create_restaurant(
    restaurant_data: CreateRestaurantRequest
) -> CreateRestaurantResponse:
    try:
        success = create_one_restaurant(request=restaurant_data)
        return CreateRestaurantResponse(
            success=success
        )
    except Exception as exp:
        return HTTPException(status_code=500, detail=str(exp))
    

@router.post("/res-review")
def create_restaurant_review(
    review_data: CreateRestaurantReviewRequest
) -> CreateRestaurantReviewResponse:
    """Endpoint to send a restaurant review."""
    try:
        success = create_one_restaurant_review(request=review_data)
        return CreateRestaurantReviewResponse(
            success=success
        )
    except Exception as exp:
        return HTTPException(status_code=500, detail=str(exp))