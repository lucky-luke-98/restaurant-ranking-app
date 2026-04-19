from datetime import datetime, timezone

from src.config import settings
from src.db.mongo_client import get_mongo_collection
from src.users.services import verify_user_entry
from src.restaurants.models import (
    CreateRestaurantReviewRequest,
    GetReviewsByRestaurantRequest,
    UpdateRestaurantReviewRequest,
    DeleteReviewRequest,
    GetReviewedRestaurantIdsByUserRequest,
    RestaurantReview,
    VisitedEntry,
    ReviewImage,
    CreateFoodReviewRequest,
    FoodReview,
    FoodReviewImage,
    GetFoodReviewsByRestaurantRequest,
    UpdateFoodReviewRequest,
    DeleteFoodReviewRequest
)
from src.utils.wrappers import service


# ==================== restaurant reviews ==================== #

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
    valid_images = [img for img in request.images if len(img) <= settings.max_image_bytes]
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

    # Handle images update: replace the full set when provided
    images_changed = False
    if request.images is not None:
        valid_images = [img for img in request.images if len(img) <= settings.max_image_bytes]
        images_collection = get_mongo_collection(collection_name=settings.mongo_images_collection)
        images_collection.delete_many({"review_id": request.review_id})
        for img_data in valid_images:
            doc = ReviewImage(review_id=request.review_id, data=img_data).model_dump()
            images_collection.insert_one(doc)
        images_changed = True

    if not updates:
        return images_changed
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = collection.update_one(
        {"review_id": request.review_id},
        {"$set": updates},
    )
    return result.modified_count > 0 or images_changed


@service
def get_friends_feed(
    user_id: str,
    cursor_created_at: str | None,
    cursor_review_id: str | None,
    limit: int = 20,
) -> tuple[list[dict], bool]:
    """
    Returns a reverse-chronological page of reviews authored or coauthored by the
    user's accepted friends. Excludes reviews where the user is author or coauthor.
    Uses keyset pagination on (created_at, review_id) for stability under new inserts.
    """
    from src.users.services import get_friends

    friends = get_friends(user_id)
    friend_ids = [f["user_id"] for f in friends]
    if not friend_ids:
        return [], False

    reviews_col = get_mongo_collection(collection_name=settings.mongo_reviews_collection)
    users_col = get_mongo_collection(collection_name=settings.mongo_users_collection)
    restaurants_col = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)

    query: dict = {
        "$and": [
            {"$or": [
                {"user_id": {"$in": friend_ids}},
                {"coauthor_ids": {"$in": friend_ids}},
            ]},
            {"user_id": {"$ne": user_id}},
            {"coauthor_ids": {"$ne": user_id}},
        ]
    }
    if cursor_created_at and cursor_review_id:
        query["$and"].append({"$or": [
            {"created_at": {"$lt": cursor_created_at}},
            {"created_at": cursor_created_at, "review_id": {"$lt": cursor_review_id}},
        ]})

    reviews = list(
        reviews_col.find(query)
        .sort([("created_at", -1), ("review_id", -1)])
        .limit(limit + 1)
    )
    has_more = len(reviews) > limit
    if has_more:
        reviews = reviews[:limit]
    if not reviews:
        return [], False

    user_ids_set = {r["user_id"] for r in reviews}
    for r in reviews:
        for cid in r.get("coauthor_ids", []):
            user_ids_set.add(cid)

    user_map: dict = {}
    if user_ids_set:
        users = users_col.find(
            {"user_id": {"$in": list(user_ids_set)}},
            {"user_id": 1, "first_name": 1, "avatar": 1},
        )
        user_map = {
            u["user_id"]: {"first_name": u.get("first_name", ""), "avatar": u.get("avatar")}
            for u in users
        }

    restaurant_ids = list({r["restaurant_id"] for r in reviews})
    restaurant_map: dict = {}
    if restaurant_ids:
        rlist = restaurants_col.find(
            {"restaurant_id": {"$in": restaurant_ids}},
            {
                "restaurant_id": 1,
                "name": 1,
                "cuisine_type": 1,
                "street": 1,
                "city": 1,
                "latitude": 1,
                "longitude": 1,
            },
        )
        restaurant_map = {
            r["restaurant_id"]: {
                "restaurant_id": r["restaurant_id"],
                "name": r.get("name", ""),
                "cuisine_type": r.get("cuisine_type"),
                "street": r.get("street"),
                "city": r.get("city"),
                "latitude": r.get("latitude"),
                "longitude": r.get("longitude"),
            }
            for r in rlist
        }

        food_reviews_col = get_mongo_collection(
            collection_name=settings.mongo_food_reviews_collection
        )
        food_rating_pipeline = [
            {"$match": {"restaurant_id": {"$in": restaurant_ids}}},
            {"$group": {
                "_id": "$restaurant_id",
                "avg_rating": {"$avg": "$rating"},
                "count": {"$sum": 1},
            }},
        ]
        for agg in food_reviews_col.aggregate(food_rating_pipeline):
            rid = agg["_id"]
            if rid in restaurant_map:
                restaurant_map[rid]["avg_rating"] = (
                    round(agg["avg_rating"], 1) if agg["avg_rating"] is not None else None
                )
                restaurant_map[rid]["rating_count"] = agg["count"]

    for review in reviews:
        review.pop("_id", None)
        info = user_map.get(review["user_id"], {})
        review["first_name"] = info.get("first_name", "")
        if info.get("avatar"):
            review["avatar"] = info["avatar"]
        if review.get("coauthor_ids"):
            review["coauthors"] = [
                {
                    "user_id": cid,
                    "first_name": user_map.get(cid, {}).get("first_name", ""),
                    "avatar": user_map.get(cid, {}).get("avatar"),
                }
                for cid in review["coauthor_ids"]
            ]
        review["restaurant"] = restaurant_map.get(review["restaurant_id"])

    return reviews, has_more


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

    valid_images = [img for img in request.images if len(img) <= settings.max_image_bytes]
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
        assert isinstance(review, dict), "Make sure the review is of type dictionary."
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
            {"$match": {
                "$or": [{"user_id": user_id}, {"coauthor_ids": user_id}],
                "restaurant_id": {"$in": restaurant_ids},
                "visited_at": {"$ne": None},
            }},
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