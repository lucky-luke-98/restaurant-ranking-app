"""Review-domain business logic: restaurant reviews and food reviews."""

from datetime import datetime, timezone

from src.config import settings
from src.unit_of_work import UnitOfWork
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
    DeleteFoodReviewRequest,
)
from src.utils.wrappers import service


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _profile_map(profiles: list[dict]) -> dict:
    """Index lightweight profiles by user_id, keeping only first_name + avatar."""
    return {
        p["user_id"]: {"first_name": p.get("first_name", ""), "avatar": p.get("avatar")}
        for p in profiles
    }


class ReviewService:
    """Restaurant reviews, the friends feed, and review-level stats/images."""

    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    # ---- helpers ----

    def _move_to_visited(self, user_id: str, restaurant_id: str) -> None:
        """Ensure a visited entry exists for (user, restaurant) and drop any wishlist entry."""
        if not self._uow.visited.get_by_user_and_restaurant(user_id, restaurant_id):
            self._uow.visited.add(VisitedEntry(user_id=user_id, restaurant_id=restaurant_id))
        self._uow.wishlist.delete_by_user_and_restaurant(user_id, restaurant_id)

    # ---- restaurant reviews ----

    @service
    def create_one_restaurant_review(self, request: CreateRestaurantReviewRequest, user_id: str) -> str | None:
        """Create a restaurant review, move author + coauthors to visited, store images."""
        if not self._uow.users.exists(user_id):
            raise ValueError("User ID not found in the db. Please set the user first.")
        if user_id in request.coauthor_ids:
            raise ValueError("You cannot add yourself as a coauthor of your own review.")
        for coauthor_id in request.coauthor_ids:
            if not self._uow.users.exists(coauthor_id):
                raise ValueError(f"Coauthor user '{coauthor_id}' not found.")

        review = RestaurantReview(
            **request.model_dump(exclude={"coauthor_ids", "images"}), user_id=user_id
        )
        if not self._uow.reviews.add(review, request.coauthor_ids):
            return None

        self._move_to_visited(user_id, request.restaurant_id)
        for coauthor_id in request.coauthor_ids:
            self._move_to_visited(coauthor_id, request.restaurant_id)

        for img in request.images:
            if len(img) <= settings.max_image_bytes:
                self._uow.images.add_review_image(ReviewImage(review_id=review.review_id, data=img))

        return review.review_id

    @service
    def get_reviews_by_restaurant(self, request: GetReviewsByRestaurantRequest) -> list[dict]:
        """Return all reviews for a restaurant, enriched with reviewer/coauthor info."""
        reviews = self._uow.reviews.list_for_restaurant(request.restaurant_id)

        ids = {r["user_id"] for r in reviews}
        for review in reviews:
            ids.update(review.get("coauthor_ids", []))
        user_map = _profile_map(self._uow.users.get_profiles(list(ids)))

        for review in reviews:
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
        return reviews

    @service
    def get_review_by_id(self, review_id: str) -> dict | None:
        """Return a single review by id."""
        return self._uow.reviews.get(review_id)

    @service
    def delete_review(self, request: DeleteReviewRequest) -> bool:
        """Delete a review, its images, and any food reviews (with their images)."""
        if not self._uow.reviews.delete(request.review_id):
            return False
        self._uow.images.delete_by_review(request.review_id)
        food_review_ids = self._uow.food_reviews.list_ids_for_review(request.review_id)
        if food_review_ids:
            self._uow.food_reviews.delete_for_review(request.review_id)
            self._uow.images.delete_by_food_reviews(food_review_ids)
        return True

    @service
    def leave_review(self, review_id: str, user_id: str) -> bool:
        """Remove a coauthor from a review's coauthor list."""
        return self._uow.reviews.pull_coauthor(review_id, user_id)

    @service
    def update_restaurant_review(self, request: UpdateRestaurantReviewRequest) -> bool:
        """Update a restaurant review, its coauthors, and/or its images."""
        updates: dict = {}
        for field in ("cleanliness_rating", "experience_rating", "comment", "visited_at"):
            value = getattr(request, field)
            if value is not None:
                updates[field] = value.isoformat() if hasattr(value, "isoformat") else value

        if request.coauthor_ids is not None:
            review = self._uow.reviews.get(request.review_id)
            if review and review["user_id"] in request.coauthor_ids:
                raise ValueError("The review's author cannot be added as a coauthor.")
            for coauthor_id in request.coauthor_ids:
                if not self._uow.users.exists(coauthor_id):
                    raise ValueError(f"Coauthor user '{coauthor_id}' not found.")
            updates["coauthor_ids"] = request.coauthor_ids
            if review:
                for coauthor_id in request.coauthor_ids:
                    self._move_to_visited(coauthor_id, review["restaurant_id"])

        images_changed = False
        if request.images is not None:
            self._uow.images.delete_by_review(request.review_id)
            for img in request.images:
                if len(img) <= settings.max_image_bytes:
                    self._uow.images.add_review_image(ReviewImage(review_id=request.review_id, data=img))
            images_changed = True

        if not updates:
            return images_changed
        updates["updated_at"] = _now_iso()
        return self._uow.reviews.update_fields(request.review_id, updates) or images_changed

    @service
    def get_friends_feed(
        self,
        user_id: str,
        cursor_created_at: str | None,
        cursor_review_id: str | None,
        limit: int = 20,
    ) -> tuple[list[dict], bool]:
        """Return a reverse-chronological page of reviews by the user's friends."""
        friend_entries = self._uow.friends.list_for_user(user_id, "accepted")
        friend_ids = [e["friend_user_id"] for e in friend_entries]
        if not friend_ids:
            return [], False

        reviews = self._uow.reviews.find_friends_feed(
            friend_ids, user_id, cursor_created_at, cursor_review_id, limit
        )
        has_more = len(reviews) > limit
        if has_more:
            reviews = reviews[:limit]
        if not reviews:
            return [], False

        # Reviewer + coauthor profiles
        user_ids_set = {r["user_id"] for r in reviews}
        for review in reviews:
            user_ids_set.update(review.get("coauthor_ids", []))
        user_map = _profile_map(self._uow.users.get_profiles(list(user_ids_set)))

        # Restaurant summaries + aggregate food ratings
        restaurant_ids = list({r["restaurant_id"] for r in reviews})
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
            for r in self._uow.restaurants.get_many(restaurant_ids)
        }
        for stat in self._uow.food_reviews.rating_stats(restaurant_ids):
            rid = stat["restaurant_id"]
            if rid in restaurant_map:
                restaurant_map[rid]["avg_rating"] = (
                    round(stat["avg_rating"], 1) if stat["avg_rating"] is not None else None
                )
                restaurant_map[rid]["rating_count"] = stat["count"]

        for review in reviews:
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
    def get_reviewed_restaurant_ids_by_user(self, request: GetReviewedRestaurantIdsByUserRequest) -> list[str]:
        """Return distinct restaurant ids that a user has reviewed."""
        return self._uow.reviews.list_reviewed_restaurant_ids(request.user_id)

    @service
    def get_food_review_stats(self, restaurant_ids: list[str], user_id: str | None = None) -> list[dict]:
        """Return food review count, average rating, and the user's last visit date."""
        stats = {
            r["restaurant_id"]: {
                "restaurant_id": r["restaurant_id"],
                "count": r["count"],
                "avg_rating": round(r["avg_rating"], 1) if r["avg_rating"] is not None else None,
                "last_visited": None,
            }
            for r in self._uow.food_reviews.rating_stats(restaurant_ids)
        }
        for rid in restaurant_ids:
            if rid not in stats:
                stats[rid] = {"restaurant_id": rid, "count": 0, "avg_rating": None, "last_visited": None}

        if user_id:
            for r in self._uow.reviews.max_visited_at_by_restaurant(user_id, restaurant_ids):
                if r["restaurant_id"] in stats:
                    stats[r["restaurant_id"]]["last_visited"] = (
                        str(r["last_visited"]) if r["last_visited"] else None
                    )
            for r in self._uow.food_reviews.max_visited_at_by_restaurant(user_id, restaurant_ids):
                rid = r["restaurant_id"]
                if rid in stats:
                    new_val = str(r["last_visited"]) if r["last_visited"] else None
                    existing = stats[rid]["last_visited"]
                    if new_val and (not existing or new_val > existing):
                        stats[rid]["last_visited"] = new_val

        return list(stats.values())

    @service
    def get_images_by_review(self, review_id: str) -> list[dict]:
        """Return all images for a restaurant review."""
        return self._uow.images.list_by_review(review_id)


class FoodReviewService:
    """Food reviews scoped to a restaurant review."""

    def __init__(self, uow: UnitOfWork):
        self._uow = uow

    @service
    def create_food_review(self, request: CreateFoodReviewRequest, user_id: str) -> str | None:
        """Create a food review. Requires an owning/coauthored parent review."""
        if not self._uow.users.exists(user_id):
            raise ValueError("User ID not found in the db. Please set the user first.")

        parent_review = self._uow.reviews.find_authored(
            request.review_id, request.restaurant_id, user_id
        )
        if not parent_review:
            raise ValueError("You must submit a restaurant review before adding a food review.")

        food_review = FoodReview(**request.model_dump(exclude={"images"}), user_id=user_id)
        if not self._uow.food_reviews.add(food_review):
            return None

        for img in request.images:
            if len(img) <= settings.max_image_bytes:
                self._uow.images.add_food_review_image(
                    FoodReviewImage(food_review_id=food_review.food_review_id, data=img)
                )

        return food_review.food_review_id

    @service
    def get_food_reviews_by_restaurant(self, request: GetFoodReviewsByRestaurantRequest) -> list[dict]:
        """Return all food reviews for a restaurant, enriched with reviewer info."""
        food_reviews = self._uow.food_reviews.list_for_restaurant(request.restaurant_id)
        user_map = _profile_map(
            self._uow.users.get_profiles(list({r["user_id"] for r in food_reviews}))
        )
        for review in food_reviews:
            info = user_map.get(review["user_id"], {})
            review["first_name"] = info.get("first_name", "")
            if info.get("avatar"):
                review["avatar"] = info["avatar"]
        return food_reviews

    @service
    def get_food_review_by_id(self, food_review_id: str) -> dict | None:
        """Return a single food review by id."""
        return self._uow.food_reviews.get(food_review_id)

    @service
    def delete_food_review(self, request: DeleteFoodReviewRequest) -> bool:
        """Delete a food review and its images."""
        if not self._uow.food_reviews.delete(request.food_review_id):
            return False
        self._uow.images.delete_by_food_review(request.food_review_id)
        return True

    @service
    def update_food_review(self, request: UpdateFoodReviewRequest) -> bool:
        """Update a food review with the provided fields."""
        updates: dict = {}
        for field in ("food_name", "price", "rating", "comment", "visited_at"):
            value = getattr(request, field)
            if value is not None:
                updates[field] = value.isoformat() if hasattr(value, "isoformat") else value
        if not updates:
            return False
        updates["updated_at"] = _now_iso()
        return self._uow.food_reviews.update_fields(request.food_review_id, updates)

    @service
    def get_images_by_food_review(self, food_review_id: str) -> list[dict]:
        """Return all images for a food review."""
        return self._uow.images.list_by_food_review(food_review_id)
