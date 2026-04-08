from datetime import datetime, timezone

import requests
from loguru import logger
from pymongo.errors import DuplicateKeyError

from src.db.mongo_client import get_mongo_collection, get_mongo_client
from src.users import verify_user_entry
from src.restaurants.models import (
    Restaurant,
    RestaurantReview,
    ReviewImage,
    FoodReview,
    FoodReviewImage,
    WishlistEntry,
    VisitedEntry,
    PlaceSearchResult,
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

    # Derive cuisine_type from Google's place types (lowercase to match CUISINE_TYPES)
    google_types = set(data.get("types", []))
    cuisine_type = "others"
    type_mapping = {"bakery": "others", "cafe": "cafe", "bar": "bar", "meal_delivery": "others", "meal_takeaway": "others"}
    for gt in google_types:
        if gt in type_mapping:
            cuisine_type = type_mapping[gt]
            break

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
def create_one_restaurant(request: CreateRestaurantRequest, user_id: str) -> str | None:
    """
    Creates a restaurant by fetching details from Google Places using the place ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)

    # Return existing restaurant if already present, updating cuisine_type if needed
    existing = collection.find_one({"google_place_id": request.google_place_id})
    if existing:
        if existing.get("cuisine_type") != request.cuisine_type:
            collection.update_one(
                {"restaurant_id": existing["restaurant_id"]},
                {"$set": {"cuisine_type": request.cuisine_type}},
            )
        return existing["restaurant_id"]

    place_data = _fetch_place_details(request.google_place_id)
    place_data["cuisine_type"] = request.cuisine_type
    place_data["created_by"] = user_id
    restaurant = Restaurant(**place_data)
    try:
        result = collection.insert_one(restaurant.model_dump())
    except DuplicateKeyError:
        existing = collection.find_one({"google_place_id": request.google_place_id})
        return existing["restaurant_id"] if existing else None
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
def create_one_restaurant_review(request: CreateRestaurantReviewRequest, user_id: str) -> str | None:
    """
    Creates one restaurant review entry based on provided information.
    If coauthor_ids are provided, stores them on the review and creates
    visited entries for each coauthor.
    """
    if not verify_user_entry(user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    # Validate all coauthor IDs exist before proceeding
    if request.coauthor_ids:
        for coauthor_id in request.coauthor_ids:
            if not verify_user_entry(coauthor_id):
                raise ValueError(f"Coauthor user '{coauthor_id}' not found.")

    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    review_data = request.model_dump(exclude={"coauthor_ids", "images"})
    review = RestaurantReview(**review_data, user_id=user_id)
    doc = review.model_dump(mode="json")
    if request.coauthor_ids:
        doc["coauthor_ids"] = request.coauthor_ids
    result = collection.insert_one(doc)
    if not result.acknowledged:
        return None

    # Move from wishlist to visited for the reviewer
    visited_col = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    wishlist_col = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)

    existing_visited = visited_col.find_one({"user_id": user_id, "restaurant_id": request.restaurant_id})
    if not existing_visited:
        entry = VisitedEntry(user_id=user_id, restaurant_id=request.restaurant_id)
        visited_col.insert_one(entry.model_dump())
    wishlist_col.delete_one({"user_id": user_id, "restaurant_id": request.restaurant_id})

    # Create visited entries for coauthors
    if request.coauthor_ids:
        for coauthor_id in request.coauthor_ids:
            existing = visited_col.find_one({
                "user_id": coauthor_id,
                "restaurant_id": request.restaurant_id,
            })
            if not existing:
                entry = VisitedEntry(user_id=coauthor_id, restaurant_id=request.restaurant_id)
                visited_col.insert_one(entry.model_dump())
            wishlist_col.delete_one({"user_id": coauthor_id, "restaurant_id": request.restaurant_id})

    # Store review images
    MAX_IMAGE_BYTES = 12_000_000
    valid_images = [img for img in request.images if len(img) <= MAX_IMAGE_BYTES]
    if valid_images:
        images_collection = get_mongo_collection(collection_name=settings.mongo_images_collection)
        for img_data in valid_images:
            doc = ReviewImage(review_id=review.review_id, data=img_data).model_dump()
            images_collection.insert_one(doc)

    return review.review_id


@service
def get_reviews_by_restaurant(request: GetReviewsByRestaurantRequest) -> list[dict]:
    """
    Returns all reviews for a given restaurant, enriched with reviewer first_name.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    users_collection = get_mongo_collection(collection_name=settings.mongo_users_collection)
    reviews = list(collection.find({"restaurant_id": request.restaurant_id}))
    user_ids = list({r["user_id"] for r in reviews})
    user_map = {}
    if user_ids:
        users = users_collection.find({"user_id": {"$in": user_ids}}, {"user_id": 1, "first_name": 1, "avatar": 1})
        user_map = {u["user_id"]: {"first_name": u.get("first_name", ""), "avatar": u.get("avatar")} for u in users}
    # Collect all user IDs including coauthors
    coauthor_ids_all = set()
    for review in reviews:
        for cid in review.get("coauthor_ids", []):
            coauthor_ids_all.add(cid)
    extra_ids = coauthor_ids_all - set(user_ids)
    if extra_ids:
        extra_users = users_collection.find({"user_id": {"$in": list(extra_ids)}}, {"user_id": 1, "first_name": 1, "avatar": 1})
        for u in extra_users:
            user_map[u["user_id"]] = {"first_name": u.get("first_name", ""), "avatar": u.get("avatar")}

    for review in reviews:
        review.pop("_id", None)
        info = user_map.get(review["user_id"], {})
        review["first_name"] = info.get("first_name", "")
        if info.get("avatar"):
            review["avatar"] = info["avatar"]
        # Enrich coauthors
        if review.get("coauthor_ids"):
            review["coauthors"] = []
            for cid in review["coauthor_ids"]:
                ci = user_map.get(cid, {})
                review["coauthors"].append({
                    "user_id": cid,
                    "first_name": ci.get("first_name", ""),
                    "avatar": ci.get("avatar"),
                })
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
    Deletes a restaurant review by its ID and all associated images.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    result = collection.delete_one({"review_id": request.review_id})
    if result.deleted_count > 0:
        images_collection = get_mongo_collection(collection_name=settings.mongo_images_collection)
        images_collection.delete_many({"review_id": request.review_id})
        return True
    return False


@service
def leave_review(review_id: str, user_id: str) -> bool:
    """Removes a coauthor from a review's coauthor_ids list."""
    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    result = collection.update_one(
        {"review_id": review_id},
        {"$pull": {"coauthor_ids": user_id}},
    )
    return result.modified_count > 0


@service
def update_restaurant_review(request: UpdateRestaurantReviewRequest) -> bool:
    """Updates a restaurant review with the provided fields."""
    collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    updates = {}
    for field in ("cleanliness_rating", "experience_rating", "comment", "visited_at"):
        value = getattr(request, field)
        if value is not None:
            updates[field] = value.isoformat() if hasattr(value, "isoformat") else value

    # Handle coauthor_ids update
    if request.coauthor_ids is not None:
        # Validate all coauthor IDs exist
        for coauthor_id in request.coauthor_ids:
            if not verify_user_entry(coauthor_id):
                raise ValueError(f"Coauthor user '{coauthor_id}' not found.")
        updates["coauthor_ids"] = request.coauthor_ids

        # Create visited entries for new coauthors
        review = collection.find_one({"review_id": request.review_id})
        if review:
            visited_col = get_mongo_collection(collection_name=settings.mongo_visited_collection)
            wishlist_col = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
            for coauthor_id in request.coauthor_ids:
                existing = visited_col.find_one({
                    "user_id": coauthor_id,
                    "restaurant_id": review["restaurant_id"],
                })
                if not existing:
                    entry = VisitedEntry(user_id=coauthor_id, restaurant_id=review["restaurant_id"])
                    visited_col.insert_one(entry.model_dump())
                wishlist_col.delete_one({"user_id": coauthor_id, "restaurant_id": review["restaurant_id"]})

    if not updates:
        return False
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = collection.update_one(
        {"review_id": request.review_id},
        {"$set": updates},
    )
    return result.modified_count > 0


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
def create_food_review(request: CreateFoodReviewRequest, user_id: str) -> str | None:
    """
    Creates a food review entry based on provided information.
    Requires the user to have a restaurant review for this restaurant first.
    Also stores any attached images in the images collection.
    """
    if not verify_user_entry(user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    # Require the user to be an owner or coauthor of a restaurant review
    reviews_col = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    has_review = reviews_col.find_one({
        "restaurant_id": request.restaurant_id,
        "$or": [
            {"user_id": user_id},
            {"coauthor_ids": user_id},
        ],
    })
    if not has_review:
        raise ValueError("You must submit a restaurant review before adding a food review.")

    collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    review_data = request.model_dump(exclude={"images"})
    food_review = FoodReview(**review_data, user_id=user_id)
    result = collection.insert_one(food_review.model_dump(mode="json"))
    if not result.acknowledged:
        return None

    MAX_IMAGE_BYTES = 12_000_000  # ~12MB base64 limit per image (must fit in 16MB BSON doc)
    valid_images = [img for img in request.images if len(img) <= MAX_IMAGE_BYTES]
    if valid_images:
        images_collection = get_mongo_collection(collection_name=settings.mongo_images_collection)
        for img_data in valid_images:
            doc = FoodReviewImage(food_review_id=food_review.food_review_id, data=img_data).model_dump()
            images_collection.insert_one(doc)

    return food_review.food_review_id


@service
def get_food_reviews_by_restaurant(request: GetFoodReviewsByRestaurantRequest) -> list[dict]:
    """
    Returns all food reviews for a given restaurant, enriched with reviewer first_name.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    users_collection = get_mongo_collection(collection_name=settings.mongo_users_collection)
    food_reviews = list(collection.find({"restaurant_id": request.restaurant_id}))
    user_ids = list({r["user_id"] for r in food_reviews})
    user_map = {}
    if user_ids:
        users = users_collection.find({"user_id": {"$in": user_ids}}, {"user_id": 1, "first_name": 1, "avatar": 1})
        user_map = {u["user_id"]: {"first_name": u.get("first_name", ""), "avatar": u.get("avatar")} for u in users}
    for review in food_reviews:
        review.pop("_id", None)
        info = user_map.get(review["user_id"], {})
        review["first_name"] = info.get("first_name", "")
        if info.get("avatar"):
            review["avatar"] = info["avatar"]
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
    Deletes a food review by its ID and all associated images.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    result = collection.delete_one({"food_review_id": request.food_review_id})
    if result.deleted_count > 0:
        images_collection = get_mongo_collection(collection_name=settings.mongo_images_collection)
        images_collection.delete_many({"food_review_id": request.food_review_id})
        return True
    return False


@service
def update_food_review(request: UpdateFoodReviewRequest) -> bool:
    """Updates a food review with the provided fields."""
    collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    updates = {}
    for field in ("food_name", "price", "rating", "comment", "visited_at"):
        value = getattr(request, field)
        if value is not None:
            updates[field] = value.isoformat() if hasattr(value, "isoformat") else value
    if not updates:
        return False
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = collection.update_one(
        {"food_review_id": request.food_review_id},
        {"$set": updates},
    )
    return result.modified_count > 0


@service
def get_images_by_review(review_id: str) -> list[dict]:
    """
    Returns all images for a given restaurant review.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_images_collection)
    images = list(collection.find({"review_id": review_id}))
    for img in images:
        img.pop("_id", None)
    return images


@service
def get_images_by_food_review(food_review_id: str) -> list[dict]:
    """
    Returns all images for a given food review.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_images_collection)
    images = list(collection.find({"food_review_id": food_review_id}))
    for img in images:
        img.pop("_id", None)
    return images


@service
def get_food_review_stats(restaurant_ids: list[str], user_id: str | None = None) -> list[dict]:
    """
    Returns food review count and average rating for each given restaurant.
    If user_id is provided, also returns the user's most recent visited_at date
    across both restaurant reviews and food reviews.
    """
    food_collection = get_mongo_collection(collection_name=settings.mongo_food_reviews_collection)
    pipeline = [
        {"$match": {"restaurant_id": {"$in": restaurant_ids}}},
        {"$group": {
            "_id": "$restaurant_id",
            "count": {"$sum": 1},
            "avg_rating": {"$avg": "$rating"},
        }},
    ]
    results = list(food_collection.aggregate(pipeline))
    stats = {
        r["_id"]: {
            "restaurant_id": r["_id"],
            "count": r["count"],
            "avg_rating": round(r["avg_rating"], 1) if r["avg_rating"] is not None else None,
            "last_visited": None,
        }
        for r in results
    }

    # Ensure all requested restaurants appear in output
    for rid in restaurant_ids:
        if rid not in stats:
            stats[rid] = {"restaurant_id": rid, "count": 0, "avg_rating": None, "last_visited": None}

    # Find user's last visited date from both review types
    if user_id:
        reviews_collection = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
        user_review_pipeline = [
            {"$match": {"user_id": user_id, "restaurant_id": {"$in": restaurant_ids}, "visited_at": {"$ne": None}}},
            {"$group": {"_id": "$restaurant_id", "last_visited": {"$max": "$visited_at"}}},
        ]
        for r in reviews_collection.aggregate(user_review_pipeline):
            if r["_id"] in stats:
                stats[r["_id"]]["last_visited"] = str(r["last_visited"]) if r["last_visited"] else None

        user_food_pipeline = [
            {"$match": {"user_id": user_id, "restaurant_id": {"$in": restaurant_ids}, "visited_at": {"$ne": None}}},
            {"$group": {"_id": "$restaurant_id", "last_visited": {"$max": "$visited_at"}}},
        ]
        for r in food_collection.aggregate(user_food_pipeline):
            rid = r["_id"]
            if rid in stats:
                new_val = str(r["last_visited"]) if r["last_visited"] else None
                existing = stats[rid]["last_visited"]
                if new_val and (not existing or new_val > existing):
                    stats[rid]["last_visited"] = new_val

    return list(stats.values())


# ==================== wishlist ==================== #

@service
def create_wishlist_entry(request: CreateWishlistEntryRequest, user_id: str) -> str | None:
    """
    Creates one restaurant wishlist entry based on provided information.
    """
    if not verify_user_entry(user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    collection = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)
    wishlist_entry = WishlistEntry(**request.model_dump(), user_id=user_id)
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
def create_visited_entry(request: CreateVisitedEntryRequest, user_id: str) -> str | None:
    """
    Creates a visited entry for a user and restaurant.
    """
    if not verify_user_entry(user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    collection = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    existing = collection.find_one({"user_id": user_id, "restaurant_id": request.restaurant_id})
    if existing:
        return existing["entry_id"]

    visited_entry = VisitedEntry(**request.model_dump(), user_id=user_id)
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
def move_wishlist_to_visited_entry(request: CreateVisitedEntryRequest, user_id: str) -> str | None:
    """
    Atomically moves a restaurant from wishlist to visited using a transaction.
    """
    if not verify_user_entry(user_id):
        raise ValueError("User ID not found in the db. Please set the user first.")

    client = get_mongo_client()
    visited_col = get_mongo_collection(collection_name=settings.mongo_visited_collection)
    wishlist_col = get_mongo_collection(collection_name=settings.mongo_wishlist_collection)

    with client.start_session() as session:
        with session.start_transaction():
            existing = visited_col.find_one(
                {"user_id": user_id, "restaurant_id": request.restaurant_id},
                session=session,
            )
            if existing:
                entry_id = existing["entry_id"]
            else:
                visited_entry = VisitedEntry(**request.model_dump(), user_id=user_id)
                visited_col.insert_one(visited_entry.model_dump(), session=session)
                entry_id = visited_entry.entry_id

            wishlist_col.delete_one(
                {"user_id": user_id, "restaurant_id": request.restaurant_id},
                session=session,
            )
    return entry_id