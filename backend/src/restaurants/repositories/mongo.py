"""MongoDB adapters implementing the restaurants-domain repository interfaces.

All Mongo-specific query construction lives here. Aggregation results are
re-keyed (``_id`` -> ``restaurant_id``) so callers never see the driver's naming.
"""

from pymongo.errors import DuplicateKeyError

from src.config import settings
from src.db.base_repository import MongoRepository, SessionProvider
from src.db.errors import AlreadyExistsError
from src.restaurants.models import (
    Restaurant,
    RestaurantReview,
    FoodReview,
    ReviewImage,
    FoodReviewImage,
    WishlistEntry,
    VisitedEntry,
)
from src.restaurants.repositories.base import (
    RestaurantRepository,
    ReviewRepository,
    FoodReviewRepository,
    ImageRepository,
    WishlistRepository,
    VisitedRepository,
)


def _strip(doc: dict | None) -> dict | None:
    if doc is not None:
        doc.pop("_id", None)
    return doc


def _strip_all(docs: list[dict]) -> list[dict]:
    for doc in docs:
        doc.pop("_id", None)
    return docs


class MongoRestaurantRepository(MongoRepository, RestaurantRepository):

    def __init__(self, session_provider: SessionProvider | None = None):
        super().__init__(settings.mongo_restaurants_collection, session_provider)

    def add(self, restaurant: Restaurant) -> None:
        try:
            self._collection.insert_one(restaurant.model_dump(), session=self._session)
        except DuplicateKeyError as exc:
            raise AlreadyExistsError("Restaurant already exists.") from exc

    def get(self, restaurant_id: str) -> dict | None:
        return _strip(self._collection.find_one(
            {"restaurant_id": restaurant_id}, session=self._session
        ))

    def get_by_google_place_id(self, google_place_id: str) -> dict | None:
        return _strip(self._collection.find_one(
            {"google_place_id": google_place_id}, session=self._session
        ))

    def get_many(self, restaurant_ids: list[str]) -> list[dict]:
        if not restaurant_ids:
            return []
        return _strip_all(list(self._collection.find(
            {"restaurant_id": {"$in": restaurant_ids}}, session=self._session
        )))

    def list_all(self) -> list[dict]:
        return _strip_all(list(self._collection.find({}, session=self._session)))

    def add_tags(self, restaurant_id: str, tags: list[str]) -> None:
        if not tags:
            return
        self._collection.update_one(
            {"restaurant_id": restaurant_id},
            {"$addToSet": {"tags": {"$each": tags}}},
            session=self._session,
        )

    def remove_tags(self, restaurant_id: str, tags: list[str]) -> None:
        if not tags:
            return
        self._collection.update_one(
            {"restaurant_id": restaurant_id},
            {"$pullAll": {"tags": tags}},
            session=self._session,
        )

    def distinct_tags(self) -> list[str]:
        return sorted(self._collection.distinct("tags", session=self._session))

    def delete(self, restaurant_id: str) -> bool:
        result = self._collection.delete_one(
            {"restaurant_id": restaurant_id}, session=self._session
        )
        return result.deleted_count > 0


class MongoReviewRepository(MongoRepository, ReviewRepository):

    def __init__(self, session_provider: SessionProvider | None = None):
        super().__init__(settings.mongo_reviews_collection, session_provider)

    def add(self, review: RestaurantReview, coauthor_ids: list[str]) -> bool:
        doc = review.model_dump(mode="json")
        if coauthor_ids:
            doc["coauthor_ids"] = coauthor_ids
        result = self._collection.insert_one(doc, session=self._session)
        return result.acknowledged

    def get(self, review_id: str) -> dict | None:
        return _strip(self._collection.find_one(
            {"review_id": review_id}, session=self._session
        ))

    def find_authored(self, review_id: str, restaurant_id: str, user_id: str) -> dict | None:
        return self._collection.find_one(
            {
                "review_id": review_id,
                "restaurant_id": restaurant_id,
                "$or": [{"user_id": user_id}, {"coauthor_ids": user_id}],
            },
            session=self._session,
        )

    def list_for_restaurant(self, restaurant_id: str) -> list[dict]:
        return _strip_all(list(self._collection.find(
            {"restaurant_id": restaurant_id}, session=self._session
        )))

    def list_reviewed_restaurant_ids(self, user_id: str) -> list[str]:
        reviews = self._collection.find(
            {"user_id": user_id}, {"restaurant_id": 1}, session=self._session
        )
        return list({r["restaurant_id"] for r in reviews})

    def list_by_user(self, user_id: str, limit: int = 25) -> list[dict]:
        return _strip_all(list(
            self._collection.find(
                {"$or": [{"user_id": user_id}, {"coauthor_ids": user_id}]},
                session=self._session,
            )
            .sort("created_at", -1)
            .limit(limit)
        ))

    def update_fields(self, review_id: str, updates: dict) -> bool:
        result = self._collection.update_one(
            {"review_id": review_id}, {"$set": updates}, session=self._session
        )
        return result.modified_count > 0

    def pull_coauthor(self, review_id: str, user_id: str) -> bool:
        result = self._collection.update_one(
            {"review_id": review_id},
            {"$pull": {"coauthor_ids": user_id}},
            session=self._session,
        )
        return result.modified_count > 0

    def delete(self, review_id: str) -> bool:
        result = self._collection.delete_one(
            {"review_id": review_id}, session=self._session
        )
        return result.deleted_count > 0

    def find_friends_feed(
        self,
        friend_ids: list[str],
        exclude_user_id: str,
        cursor_created_at: str | None,
        cursor_review_id: str | None,
        limit: int,
    ) -> list[dict]:
        query: dict = {
            "$and": [
                {"$or": [
                    {"user_id": {"$in": friend_ids}},
                    {"coauthor_ids": {"$in": friend_ids}},
                ]},
                {"user_id": {"$ne": exclude_user_id}},
                {"coauthor_ids": {"$ne": exclude_user_id}},
            ]
        }
        if cursor_created_at and cursor_review_id:
            query["$and"].append({"$or": [
                {"created_at": {"$lt": cursor_created_at}},
                {"created_at": cursor_created_at, "review_id": {"$lt": cursor_review_id}},
            ]})

        reviews = list(
            self._collection.find(query, session=self._session)
            .sort([("created_at", -1), ("review_id", -1)])
            .limit(limit + 1)
        )
        return _strip_all(reviews)

    def max_visited_at_by_restaurant(self, user_id: str, restaurant_ids: list[str]) -> list[dict]:
        if not restaurant_ids:
            return []
        pipeline = [
            {"$match": {
                "$or": [{"user_id": user_id}, {"coauthor_ids": user_id}],
                "restaurant_id": {"$in": restaurant_ids},
                "visited_at": {"$ne": None},
            }},
            {"$group": {"_id": "$restaurant_id", "last_visited": {"$max": "$visited_at"}}},
        ]
        return [
            {"restaurant_id": r["_id"], "last_visited": r["last_visited"]}
            for r in self._collection.aggregate(pipeline, session=self._session)
        ]


class MongoFoodReviewRepository(MongoRepository, FoodReviewRepository):

    def __init__(self, session_provider: SessionProvider | None = None):
        super().__init__(settings.mongo_food_reviews_collection, session_provider)

    def add(self, food_review: FoodReview) -> bool:
        result = self._collection.insert_one(
            food_review.model_dump(mode="json"), session=self._session
        )
        return result.acknowledged

    def get(self, food_review_id: str) -> dict | None:
        return _strip(self._collection.find_one(
            {"food_review_id": food_review_id}, session=self._session
        ))

    def list_for_restaurant(self, restaurant_id: str) -> list[dict]:
        return _strip_all(list(self._collection.find(
            {"restaurant_id": restaurant_id}, session=self._session
        )))

    def list_ids_for_review(self, review_id: str) -> list[str]:
        return [
            fr["food_review_id"]
            for fr in self._collection.find(
                {"review_id": review_id}, {"food_review_id": 1}, session=self._session
            )
        ]

    def list_by_user(self, user_id: str, limit: int = 25) -> list[dict]:
        return _strip_all(list(
            self._collection.find({"user_id": user_id}, session=self._session)
            .sort("created_at", -1)
            .limit(limit)
        ))

    def update_fields(self, food_review_id: str, updates: dict) -> bool:
        result = self._collection.update_one(
            {"food_review_id": food_review_id}, {"$set": updates}, session=self._session
        )
        return result.modified_count > 0

    def delete(self, food_review_id: str) -> bool:
        result = self._collection.delete_one(
            {"food_review_id": food_review_id}, session=self._session
        )
        return result.deleted_count > 0

    def delete_for_review(self, review_id: str) -> None:
        self._collection.delete_many({"review_id": review_id}, session=self._session)

    def rating_stats(self, restaurant_ids: list[str]) -> list[dict]:
        if not restaurant_ids:
            return []
        pipeline = [
            {"$match": {"restaurant_id": {"$in": restaurant_ids}}},
            {"$group": {
                "_id": "$restaurant_id",
                "count": {"$sum": 1},
                "avg_rating": {"$avg": "$rating"},
            }},
        ]
        return [
            {"restaurant_id": r["_id"], "count": r["count"], "avg_rating": r["avg_rating"]}
            for r in self._collection.aggregate(pipeline, session=self._session)
        ]

    def max_visited_at_by_restaurant(self, user_id: str, restaurant_ids: list[str]) -> list[dict]:
        if not restaurant_ids:
            return []
        pipeline = [
            {"$match": {
                "user_id": user_id,
                "restaurant_id": {"$in": restaurant_ids},
                "visited_at": {"$ne": None},
            }},
            {"$group": {"_id": "$restaurant_id", "last_visited": {"$max": "$visited_at"}}},
        ]
        return [
            {"restaurant_id": r["_id"], "last_visited": r["last_visited"]}
            for r in self._collection.aggregate(pipeline, session=self._session)
        ]


class MongoImageRepository(MongoRepository, ImageRepository):

    def __init__(self, session_provider: SessionProvider | None = None):
        super().__init__(settings.mongo_images_collection, session_provider)

    def add_review_image(self, image: ReviewImage) -> None:
        self._collection.insert_one(image.model_dump(), session=self._session)

    def add_food_review_image(self, image: FoodReviewImage) -> None:
        self._collection.insert_one(image.model_dump(), session=self._session)

    def list_by_review(self, review_id: str) -> list[dict]:
        return _strip_all(list(self._collection.find(
            {"review_id": review_id}, session=self._session
        )))

    def list_by_food_review(self, food_review_id: str) -> list[dict]:
        return _strip_all(list(self._collection.find(
            {"food_review_id": food_review_id}, session=self._session
        )))

    def delete_by_review(self, review_id: str) -> None:
        self._collection.delete_many({"review_id": review_id}, session=self._session)

    def delete_by_food_review(self, food_review_id: str) -> None:
        self._collection.delete_many({"food_review_id": food_review_id}, session=self._session)

    def delete_by_food_reviews(self, food_review_ids: list[str]) -> None:
        if not food_review_ids:
            return
        self._collection.delete_many(
            {"food_review_id": {"$in": food_review_ids}}, session=self._session
        )


class MongoWishlistRepository(MongoRepository, WishlistRepository):

    def __init__(self, session_provider: SessionProvider | None = None):
        super().__init__(settings.mongo_wishlist_collection, session_provider)

    def add(self, entry: WishlistEntry) -> bool:
        result = self._collection.insert_one(entry.model_dump(), session=self._session)
        return result.acknowledged

    def get(self, entry_id: str) -> dict | None:
        return _strip(self._collection.find_one(
            {"entry_id": entry_id}, session=self._session
        ))

    def list_by_user(self, user_id: str) -> list[dict]:
        return _strip_all(list(self._collection.find(
            {"user_id": user_id}, session=self._session
        )))

    def update_comment(self, entry_id: str, comment: str | None) -> bool:
        result = self._collection.update_one(
            {"entry_id": entry_id},
            {"$set": {"comment": comment or None}},
            session=self._session,
        )
        return result.modified_count > 0

    def delete(self, entry_id: str) -> bool:
        result = self._collection.delete_one({"entry_id": entry_id}, session=self._session)
        return result.deleted_count > 0

    def delete_by_user_and_restaurant(self, user_id: str, restaurant_id: str) -> bool:
        result = self._collection.delete_one(
            {"user_id": user_id, "restaurant_id": restaurant_id}, session=self._session
        )
        return result.deleted_count > 0


class MongoVisitedRepository(MongoRepository, VisitedRepository):

    def __init__(self, session_provider: SessionProvider | None = None):
        super().__init__(settings.mongo_visited_collection, session_provider)

    def add(self, entry: VisitedEntry) -> bool:
        result = self._collection.insert_one(entry.model_dump(), session=self._session)
        return result.acknowledged

    def get(self, entry_id: str) -> dict | None:
        return _strip(self._collection.find_one(
            {"entry_id": entry_id}, session=self._session
        ))

    def get_by_user_and_restaurant(self, user_id: str, restaurant_id: str) -> dict | None:
        return self._collection.find_one(
            {"user_id": user_id, "restaurant_id": restaurant_id}, session=self._session
        )

    def list_by_user(self, user_id: str) -> list[dict]:
        return _strip_all(list(self._collection.find(
            {"user_id": user_id}, session=self._session
        )))

    def delete(self, entry_id: str) -> bool:
        result = self._collection.delete_one({"entry_id": entry_id}, session=self._session)
        return result.deleted_count > 0
