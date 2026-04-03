import requests
from loguru import logger

from src.db.mongo_client import get_mongo_collection, get_mongo_client
from src.users import verify_user_entry
from src.restaurants.models import (
    Restaurant,
    RestaurantReview,
    FoodReview,
    WishlistEntry,
    VisitedEntry,
    PlaceSearchResult,
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
)
from src.utils.wrappers import service
from src.config import settings

PLACES_AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete"
PLACES_DETAILS_URL = "https://places.googleapis.com/v1/places"


# ==================== google places ==================== #

@service
def search_places(query: str) -> list[PlaceSearchResult]:
    """
    Searches Google Places Autocomplete (New) for restaurants matching the query.
    """
    response = requests.post(
        PLACES_AUTOCOMPLETE_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.google_api_key,
        },
        json={
            "input": query,
            "includedPrimaryTypes": ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"],
            "locationBias": {
                "circle": {
                    "center": {"latitude": 50.9375, "longitude": 6.9603},
                    "radius": 50000.0,
                }
            },
        },
    )
    data = response.json()
    logger.debug(f"Google Places raw response: {data}")
    suggestions = data.get("suggestions", [])
    results = [
        PlaceSearchResult(
            google_place_id=s["placePrediction"]["placeId"],
            name=s["placePrediction"]["structuredFormat"]["mainText"]["text"],
            address=s["placePrediction"]["structuredFormat"]["secondaryText"]["text"],
        )
        for s in suggestions
        if "placePrediction" in s
    ]
    results = results[:10]
    logger.info(f"Google Places search for '{query}' returned {len(results)} results")
    return results


def _fetch_place_details(google_place_id: str) -> dict:
    """
    Fetches place details from Google Places API (New) and returns parsed restaurant fields.
    """
    fields = "displayName,formattedAddress,addressComponents,location,types"
    response = requests.get(
        f"{PLACES_DETAILS_URL}/{google_place_id}",
        headers={
            "X-Goog-Api-Key": settings.google_api_key,
            "X-Goog-FieldMask": fields,
        },
    )
    data = response.json()
    if "error" in data:
        raise ValueError(f"Google Places API error: {data['error'].get('message', 'Unknown error')}")

    # Parse address components
    components = {}
    for c in data.get("addressComponents", []):
        for t in c.get("types", []):
            components[t] = c.get("longText", "")

    location = data.get("location", {})

    # Derive cuisine_type from Google's place types
    google_types = set(data.get("types", []))
    cuisine_type = "Restaurant"
    food_types = {"bakery", "cafe", "bar", "meal_delivery", "meal_takeaway"}
    matched = google_types & food_types
    if matched:
        cuisine_type = next(iter(matched)).replace("_", " ").title()

    return {
        "google_place_id": google_place_id,
        "name": data.get("displayName", {}).get("text", ""),
        "cuisine_type": cuisine_type,
        "street": f"{components.get('route', '')} {components.get('street_number', '')}".strip(),
        "city": components.get("locality", components.get("postal_town", "")),
        "country": components.get("country", ""),
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
    }


# ==================== restaurants ==================== #

@service
def create_one_restaurant(request: CreateRestaurantRequest) -> str | None:
    """
    Creates a restaurant by fetching details from Google Places using the place ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)

    # Check for duplicate
    existing = collection.find_one({"google_place_id": request.google_place_id})
    if existing:
        return existing["restaurant_id"]

    place_data = _fetch_place_details(request.google_place_id)
    restaurant = Restaurant(**place_data)
    result = collection.insert_one(restaurant.model_dump())
    if result.acknowledged:
        return restaurant.restaurant_id
    return None


@service
def get_all_restaurants() -> list[dict]:
    """
    Returns all restaurant entries from the database.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)
    restaurants = list(collection.find({}))
    for restaurant in restaurants:
        restaurant.pop("_id", None)
    return restaurants


@service
def get_restaurant_by_id(request: GetRestaurantByIdRequest) -> dict | None:
    """
    Returns a single restaurant by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)
    restaurant = collection.find_one({"restaurant_id": request.restaurant_id})
    if restaurant:
        restaurant.pop("_id", None)
    return restaurant


@service
def delete_restaurant(request: DeleteRestaurantRequest) -> bool:
    """
    Deletes a restaurant entry by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)
    result = collection.delete_one({"restaurant_id": request.restaurant_id})
    return result.deleted_count > 0


# ==================== reviews ==================== #

@service
def create_one_restaurant_review(request: CreateRestaurantReviewRequest) -> str | None:
    """
    Creates one restaurant review entry based on provided information.
    """
    if not verify_user_entry(request.user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    review = RestaurantReview(**request.model_dump())
    result = collection.insert_one(review.model_dump())
    if result.acknowledged:
        return review.review_id
    return None


@service
def get_reviews_by_restaurant(request: GetReviewsByRestaurantRequest) -> list[dict]:
    """
    Returns all reviews for a given restaurant.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    reviews = list(collection.find({"restaurant_id": request.restaurant_id}))
    for review in reviews:
        review.pop("_id", None)
    return reviews


@service
def get_review_by_id(review_id: str) -> dict | None:
    """Returns a single review by its ID."""
    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    review = collection.find_one({"review_id": review_id})
    if review:
        review.pop("_id", None)
    return review


@service
def delete_review(request: DeleteReviewRequest) -> bool:
    """
    Deletes a restaurant review by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    result = collection.delete_one({"review_id": request.review_id})
    return result.deleted_count > 0


@service
def get_reviewed_restaurant_ids_by_user(request: GetReviewedRestaurantIdsByUserRequest) -> list[str]:
    """
    Returns distinct restaurant IDs that a user has reviewed.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    reviews = list(collection.find({"user_id": request.user_id}, {"restaurant_id": 1}))
    return list({r["restaurant_id"] for r in reviews})


# ==================== food reviews ==================== #

@service
def create_food_review(request: CreateFoodReviewRequest) -> str | None:
    """
    Creates a food review entry based on provided information.
    """
    if not verify_user_entry(request.user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    food_review = FoodReview(**request.model_dump())
    result = collection.insert_one(food_review.model_dump())
    if result.acknowledged:
        return food_review.food_review_id
    return None


@service
def get_food_reviews_by_restaurant(request: GetFoodReviewsByRestaurantRequest) -> list[dict]:
    """
    Returns all food reviews for a given restaurant.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    food_reviews = list(collection.find({"restaurant_id": request.restaurant_id}))
    for review in food_reviews:
        review.pop("_id", None)
    return food_reviews


@service
def get_food_review_by_id(food_review_id: str) -> dict | None:
    """Returns a single food review by its ID."""
    collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    review = collection.find_one({"food_review_id": food_review_id})
    if review:
        review.pop("_id", None)
    return review


@service
def delete_food_review(request: DeleteFoodReviewRequest) -> bool:
    """
    Deletes a food review by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    result = collection.delete_one({"food_review_id": request.food_review_id})
    return result.deleted_count > 0


# ==================== wishlist ==================== #

@service
def create_wishlist_entry(request: CreateWishlistEntryRequest) -> str | None:
    """
    Creates one restaurant wishlist entry based on provided information.
    """
    if not verify_user_entry(request.user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    wishlist_entry = WishlistEntry(**request.model_dump())
    result = collection.insert_one(wishlist_entry.model_dump())
    if result.acknowledged:
        return wishlist_entry.entry_id
    return None


@service
def get_wishlist_by_user(request: GetWishlistByUserRequest) -> list[dict]:
    """
    Returns all wishlist entries for a given user.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    entries = list(collection.find({"user_id": request.user_id}))
    for entry in entries:
        entry.pop("_id", None)
    return entries


@service
def get_wishlist_entry_by_id(entry_id: str) -> dict | None:
    """Returns a single wishlist entry by its ID."""
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    entry = collection.find_one({"entry_id": entry_id})
    if entry:
        entry.pop("_id", None)
    return entry


@service
def delete_wishlist_entry(request: DeleteWishlistEntryRequest) -> bool:
    """
    Deletes a wishlist entry by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    result = collection.delete_one({"entry_id": request.entry_id})
    return result.deleted_count > 0


def delete_wishlist_entry_by_user_and_restaurant(user_id: str, restaurant_id: str) -> bool:
    """
    Deletes a wishlist entry by user ID and restaurant ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    result = collection.delete_one({"user_id": user_id, "restaurant_id": restaurant_id})
    return result.deleted_count > 0


# ==================== visited ==================== #

@service
def create_visited_entry(request: CreateVisitedEntryRequest) -> str | None:
    """
    Creates a visited entry for a user and restaurant.
    """
    if not verify_user_entry(request.user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    existing = collection.find_one({"user_id": request.user_id, "restaurant_id": request.restaurant_id})
    if existing:
        return existing["entry_id"]

    visited_entry = VisitedEntry(**request.model_dump())
    result = collection.insert_one(visited_entry.model_dump())
    if result.acknowledged:
        return visited_entry.entry_id
    return None


@service
def get_visited_by_user(request: GetVisitedByUserRequest) -> list[dict]:
    """
    Returns all visited entries for a given user.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    entries = list(collection.find({"user_id": request.user_id}))
    for entry in entries:
        entry.pop("_id", None)
    return entries


@service
def get_visited_entry_by_id(entry_id: str) -> dict | None:
    """Returns a single visited entry by its ID."""
    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    entry = collection.find_one({"entry_id": entry_id})
    if entry:
        entry.pop("_id", None)
    return entry


@service
def delete_visited_entry(request: DeleteVisitedEntryRequest) -> bool:
    """
    Deletes a visited entry by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    result = collection.delete_one({"entry_id": request.entry_id})
    return result.deleted_count > 0


@service
def move_wishlist_to_visited_entry(request: CreateVisitedEntryRequest) -> str | None:
    """
    Atomically moves a restaurant from wishlist to visited using a transaction.
    """
    if not verify_user_entry(request.user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    client = get_mongo_client()
    visited_col = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    wishlist_col = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)

    with client.start_session() as session:
        with session.start_transaction():
            existing = visited_col.find_one(
                {"user_id": request.user_id, "restaurant_id": request.restaurant_id},
                session=session,
            )
            if existing:
                entry_id = existing["entry_id"]
            else:
                visited_entry = VisitedEntry(**request.model_dump())
                visited_col.insert_one(visited_entry.model_dump(), session=session)
                entry_id = visited_entry.entry_id

            wishlist_col.delete_one(
                {"user_id": request.user_id, "restaurant_id": request.restaurant_id},
                session=session,
            )
    return entry_id