from uuid import uuid4

from src.db.mongo_client import get_mongo_client
from src.users import verify_user_entry
from src.restaurants.models import (
    Restaurant,
    RestaurantReview,
    CreateRestaurantRequest,
    CreateRestaurantReviewRequest
)
from src.utils.wrappers import service
from src.config import settings


@service()
def create_one_restaurant(request: CreateRestaurantRequest) -> bool:
    """
    Creates one restaurant entry based on provided information.
    """
    # get db setup
    client = get_mongo_client(collection_name=settings.mongo_restaurants_collection)

    # pass to restaurant instance and save
    restaurant_instance = Restaurant(
        restaurant_id=str(uuid4()),
        **request.model_dump()
    )
    result = client.collection.update_one({}, {"$set": restaurant_instance.model_dump()}, upsert=True)
    if result.matched_count == 0 and result.modified_count == 1:
        return True
    return False


@service()
def create_one_restaurant_review(request: CreateRestaurantReviewRequest) -> bool:
    """
    Creates one restaurant review entry based on provided information.
    """
    if not verify_user_entry(request.user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    client = get_mongo_client(collection_name=settings.mongo_reviews_collectino)
    review_instance = RestaurantReview(
        review_id=str(uuid4()), 
        **request.model_dump()
    )
    result = client.collection.insert_one(review_instance.model_dump())
    if result.acknowledged:
        return True
    return False
    