from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException
import uuid

from src.schemas.requests import (
    UserCreateRequest,
    RestaurantReviewRequest,
    RestaurantCreateRequest
)
from src.schemas.db import UserDBEntry, ReviewDBEntry
from src.schemas.responses import ResponseSchema
from src.clients.mongo_client import get_mongo_client
from src.utils.logger import logger

load_dotenv()

db_router = APIRouter()


@db_router.get("/get_all_users", tags=["users"])
def get_all_users():
    """Endpoint to get all users."""
    try:
        client = get_mongo_client(collection_name="users")
        users = list(client.collection.find({}))
        for user in users:
            assert isinstance(user, dict), "User data should be a dictionary."
            user.pop("_id", None)
        logger.debug(f"Found {len(users)} users.")
    except Exception as exp:
        logger.error(f"Error fetching users from the database: {exp}")
        raise HTTPException(status_code=500, detail=str(exp))
    finally:
        # clean up
        if client:
            client.close()

    return ResponseSchema(
        status="success", 
        message="Retrieving users successful!",
        data=users
    )

@db_router.post("/set_user", tags=["users"])
def set_user(user_data: UserCreateRequest) -> ResponseSchema:
    """Endpoint to set a user in the database."""
    if not user_data:
        raise HTTPException(status_code=400, detail="User data is required.")
    try:
        client = get_mongo_client(collection_name="users")
        # generate db entry from CreateRequest    
        user_id = str(uuid.uuid4())
        user_instance = UserDBEntry(user_id=user_id, **user_data.model_dump())

        result = client.collection.update_one({}, {"$set": user_instance.model_dump()}, upsert=True)
        if result.matched_count == 0 and result.modified_count == 1:
            logger.info(f"User {user_id} created successfully.")
        elif result.matched_count == 1:
            logger.info(f"User {user_id} updated successfully.")
        else:
            logger.error(f"Something went wrong while setting user {user_id}.")
            raise Exception("Failed to set user in the database by collection update.")
    except Exception as exp:
        logger.error(f"Error setting user {user_id}: {exp}")
        raise HTTPException(status_code=500, detail=str(exp))
    finally:
        # clean up
        if client:
            client.close()

@db_router.post("/set_restaurant", tags=["restaurants"])
def set_restaurant(
    restaurant_data: RestaurantCreateRequest
) -> ResponseSchema:
    pass

@db_router.post("/send_restaurant_review", tags=["reviews"])
def send_restaurant_review(
    review_data: RestaurantReviewRequest
) -> ResponseSchema:
    """Endpoint to send a restaurant review."""
    if not review_data:
        raise HTTPException(status_code=400, detail="User ID and review_data is required.")
    
    # check if user exists in the database
    try:
        all_users_response = get_all_users()
        if not all_users_response.status == "success":
            raise Exception("Failed to fetch all users from the database.")
        user_found = False
        for user in all_users_response.data:
            if user.get("user_id") == review_data.user_id:
                user_found = True
                break
        if not user_found:
            raise Exception("User ID not found in the database. Please set the user first.")
    except Exception as exp:
        logger.error(f"Error checking user existence for review: {exp}")
        raise HTTPException(status_code=404, detail=str(exp))
    logger.info("Found user in the database, proceeding with review submission.")

    # send to db
    try:
        client = get_mongo_client(collection_name="reviews")
        # generate db entry from CreateRequest    
        review_id = str(uuid.uuid4())
        review_instance = ReviewDBEntry(review_id=review_id, **review_data.model_dump())

        result = client.collection.insert_one(review_instance.model_dump())
        if result.acknowledged:
            logger.info(f"Restaurant review {review_id} added successfully.")
        else:
            raise Exception("Failed to insert restaurant review into the database.")
    except Exception as exp:
        logger.error(f"Error sending restaurant review {review_id}: {exp}")
        raise HTTPException(status_code=500, detail=str(exp))
    finally:
        # clean up
        if client:
            client.close()

    return ResponseSchema(
        status="success", 
        message= f"Review {review_id} send to DB successfully"
    )