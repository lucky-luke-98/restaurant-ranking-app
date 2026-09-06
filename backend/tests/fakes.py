"""In-memory fakes implementing the repository interfaces for fast, DB-free tests.

Each fake keeps its documents in a plain list of dicts (seed via ``repo.docs.append`` or
the ``uow.seed_*`` helpers in conftest). Semantics mirror the Mongo adapters where it
matters for correctness:

- every read returns *fresh copies*, because services mutate returned dicts (e.g. the
  reviewer enrichment in ``get_reviews_by_restaurant``) and Mongo hands out new dicts
  per query;
- duplicate keys raise the same errors the adapters raise (``AlreadyExistsError`` where
  the adapter translates, raw ``DuplicateKeyError`` where the unique index would fire);
- ``FakeUnitOfWork`` is NOT transactional — it only counts commits/rollbacks. Anything
  that must prove atomicity belongs in a ``@pytest.mark.mongo`` test against the real
  replica set.
"""

import re

from pymongo.errors import DuplicateKeyError

from src.db.errors import AlreadyExistsError
from src.unit_of_work import UnitOfWork
from src.users.models import User
from src.users.repositories.base import UserRepository, FriendRepository
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

_PROFILE_KEYS = ("user_id", "first_name", "last_name", "avatar")


def _copies(docs: list[dict]) -> list[dict]:
    return [dict(d) for d in docs]


def _profile(doc: dict) -> dict:
    return {k: doc.get(k) for k in _PROFILE_KEYS}


class FakeUserRepository(UserRepository):

    def __init__(self):
        self.docs: list[dict] = []

    def add(self, user: User) -> None:
        if any(d.get("mail") == user.mail for d in self.docs):
            raise AlreadyExistsError("A user with this email already exists.")
        self.docs.append(user.model_dump())

    def exists(self, user_id: str) -> bool:
        return any(d["user_id"] == user_id for d in self.docs)

    def get_by_id(self, user_id: str) -> dict | None:
        return next((dict(d) for d in self.docs if d["user_id"] == user_id), None)

    def get_by_mail(self, mail: str) -> dict | None:
        return next((dict(d) for d in self.docs if d.get("mail") == mail), None)

    def list_all(self) -> list[dict]:
        return _copies(self.docs)

    def set_last_login(self, user_id: str, timestamp: str) -> None:
        for d in self.docs:
            if d["user_id"] == user_id:
                d["last_logged_in"] = timestamp

    def set_avatar(self, user_id: str, avatar: str) -> bool:
        for d in self.docs:
            if d["user_id"] == user_id:
                d["avatar"] = avatar
                return True
        return False

    def search_by_name_prefix(self, prefix: str, exclude_user_id: str) -> list[dict]:
        pattern = re.compile(f"^{re.escape(prefix)}", re.IGNORECASE)
        return [
            _profile(d) for d in self.docs
            if d["user_id"] != exclude_user_id
            and (pattern.match(d.get("first_name", "")) or pattern.match(d.get("last_name", "")))
        ]

    def get_profiles(self, user_ids: list[str]) -> list[dict]:
        return [_profile(d) for d in self.docs if d["user_id"] in user_ids]


class FakeFriendRepository(FriendRepository):

    def __init__(self):
        self.docs: list[dict] = []

    def _match(self, user_id: str, friend_user_id: str, status: str | None):
        return [
            d for d in self.docs
            if d["user_id"] == user_id and d["friend_user_id"] == friend_user_id
            and (status is None or d["status"] == status)
        ]

    def find(self, user_id: str, friend_user_id: str, status: str | None = None) -> dict | None:
        hits = self._match(user_id, friend_user_id, status)
        return dict(hits[0]) if hits else None

    def add_pending(self, user_id: str, friend_user_id: str) -> None:
        self.docs.append({"user_id": user_id, "friend_user_id": friend_user_id, "status": "pending"})

    def set_status(self, user_id: str, friend_user_id: str, status: str) -> None:
        for d in self._match(user_id, friend_user_id, None):
            d["status"] = status

    def upsert_status(self, user_id: str, friend_user_id: str, status: str) -> None:
        hits = self._match(user_id, friend_user_id, None)
        if hits:
            hits[0]["status"] = status
        else:
            self.docs.append({"user_id": user_id, "friend_user_id": friend_user_id, "status": status})

    def delete(self, user_id: str, friend_user_id: str, status: str | None = None) -> None:
        hits = self._match(user_id, friend_user_id, status)
        if hits:
            self.docs.remove(hits[0])

    def list_for_user(self, user_id: str, status: str) -> list[dict]:
        return _copies([d for d in self.docs if d["user_id"] == user_id and d["status"] == status])

    def list_for_friend(self, friend_user_id: str, status: str) -> list[dict]:
        return _copies([d for d in self.docs
                        if d["friend_user_id"] == friend_user_id and d["status"] == status])


class FakeRestaurantRepository(RestaurantRepository):

    def __init__(self):
        self.docs: list[dict] = []

    def add(self, restaurant: Restaurant) -> None:
        if restaurant.google_place_id is not None and any(
            d.get("google_place_id") == restaurant.google_place_id for d in self.docs
        ):
            raise AlreadyExistsError("Restaurant already exists.")
        self.docs.append(restaurant.model_dump())

    def get(self, restaurant_id: str) -> dict | None:
        return next((dict(d) for d in self.docs if d["restaurant_id"] == restaurant_id), None)

    def get_by_google_place_id(self, google_place_id: str) -> dict | None:
        return next((dict(d) for d in self.docs
                     if d.get("google_place_id") == google_place_id), None)

    def get_many(self, restaurant_ids: list[str]) -> list[dict]:
        return _copies([d for d in self.docs if d["restaurant_id"] in restaurant_ids])

    def list_all(self) -> list[dict]:
        return _copies(self.docs)

    def add_tags(self, restaurant_id: str, tags: list[str]) -> None:
        for d in self.docs:
            if d["restaurant_id"] == restaurant_id:
                d["tags"] = d.get("tags", []) + [t for t in tags if t not in d.get("tags", [])]

    def remove_tags(self, restaurant_id: str, tags: list[str]) -> None:
        for d in self.docs:
            if d["restaurant_id"] == restaurant_id:
                d["tags"] = [t for t in d.get("tags", []) if t not in tags]

    def distinct_tags(self) -> list[str]:
        return sorted({t for d in self.docs for t in d.get("tags", [])})

    def delete(self, restaurant_id: str) -> bool:
        before = len(self.docs)
        self.docs = [d for d in self.docs if d["restaurant_id"] != restaurant_id]
        return len(self.docs) < before


class FakeReviewRepository(ReviewRepository):

    def __init__(self):
        self.docs: list[dict] = []

    def add(self, review: RestaurantReview, coauthor_ids: list[str]) -> bool:
        # Mirrors the unique review_id index, translated like the Mongo adapter.
        if any(d["review_id"] == review.review_id for d in self.docs):
            raise AlreadyExistsError("A review with this id already exists.")
        doc = review.model_dump(mode="json")
        if coauthor_ids:
            doc["coauthor_ids"] = list(coauthor_ids)
        self.docs.append(doc)
        return True

    def get(self, review_id: str) -> dict | None:
        return next((dict(d) for d in self.docs if d["review_id"] == review_id), None)

    def find_authored(self, review_id: str, restaurant_id: str, user_id: str) -> dict | None:
        return next(
            (dict(d) for d in self.docs
             if d["review_id"] == review_id and d["restaurant_id"] == restaurant_id
             and (d["user_id"] == user_id or user_id in d.get("coauthor_ids", []))),
            None,
        )

    def list_for_restaurant(self, restaurant_id: str) -> list[dict]:
        return _copies([d for d in self.docs if d["restaurant_id"] == restaurant_id])

    def list_reviewed_restaurant_ids(self, user_id: str) -> list[str]:
        return list({d["restaurant_id"] for d in self.docs if d["user_id"] == user_id})

    def list_by_user(self, user_id: str, limit: int = 25) -> list[dict]:
        mine = [d for d in self.docs
                if d["user_id"] == user_id or user_id in d.get("coauthor_ids", [])]
        mine.sort(key=lambda d: d.get("created_at") or "", reverse=True)
        return _copies(mine[:limit])

    def update_fields(self, review_id: str, updates: dict) -> bool:
        for d in self.docs:
            if d["review_id"] == review_id:
                d.update(updates)
                return True
        return False

    def pull_coauthor(self, review_id: str, user_id: str) -> bool:
        for d in self.docs:
            if d["review_id"] == review_id and user_id in d.get("coauthor_ids", []):
                d["coauthor_ids"] = [c for c in d["coauthor_ids"] if c != user_id]
                return True
        return False

    def delete(self, review_id: str) -> bool:
        before = len(self.docs)
        self.docs = [d for d in self.docs if d["review_id"] != review_id]
        return len(self.docs) < before

    def find_friends_feed(
        self,
        friend_ids: list[str],
        exclude_user_id: str,
        cursor_created_at: str | None,
        cursor_review_id: str | None,
        limit: int,
    ) -> list[dict]:
        rows = [
            d for d in self.docs
            if (d["user_id"] in friend_ids
                or any(c in friend_ids for c in d.get("coauthor_ids", [])))
            and d["user_id"] != exclude_user_id
            and exclude_user_id not in d.get("coauthor_ids", [])
        ]
        if cursor_created_at and cursor_review_id:
            rows = [d for d in rows
                    if (d["created_at"], d["review_id"]) < (cursor_created_at, cursor_review_id)]
        rows.sort(key=lambda d: (d["created_at"], d["review_id"]), reverse=True)
        return _copies(rows[:limit + 1])

    def max_visited_at_by_restaurant(self, user_id: str, restaurant_ids: list[str]) -> list[dict]:
        best: dict[str, str] = {}
        for d in self.docs:
            if (d["restaurant_id"] in restaurant_ids and d.get("visited_at")
                    and (d["user_id"] == user_id or user_id in d.get("coauthor_ids", []))):
                rid = d["restaurant_id"]
                best[rid] = max(best[rid], d["visited_at"]) if rid in best else d["visited_at"]
        return [{"restaurant_id": rid, "last_visited": v} for rid, v in best.items()]


class FakeFoodReviewRepository(FoodReviewRepository):

    def __init__(self):
        self.docs: list[dict] = []

    def add(self, food_review: FoodReview) -> bool:
        if any(d["food_review_id"] == food_review.food_review_id for d in self.docs):
            raise DuplicateKeyError("food_review_id duplicate")
        self.docs.append(food_review.model_dump(mode="json"))
        return True

    def get(self, food_review_id: str) -> dict | None:
        return next((dict(d) for d in self.docs if d["food_review_id"] == food_review_id), None)

    def list_for_restaurant(self, restaurant_id: str) -> list[dict]:
        return _copies([d for d in self.docs if d["restaurant_id"] == restaurant_id])

    def list_ids_for_review(self, review_id: str) -> list[str]:
        return [d["food_review_id"] for d in self.docs if d["review_id"] == review_id]

    def list_by_user(self, user_id: str, limit: int = 25) -> list[dict]:
        mine = [d for d in self.docs if d["user_id"] == user_id]
        mine.sort(key=lambda d: d.get("created_at") or "", reverse=True)
        return _copies(mine[:limit])

    def update_fields(self, food_review_id: str, updates: dict) -> bool:
        for d in self.docs:
            if d["food_review_id"] == food_review_id:
                d.update(updates)
                return True
        return False

    def delete(self, food_review_id: str) -> bool:
        before = len(self.docs)
        self.docs = [d for d in self.docs if d["food_review_id"] != food_review_id]
        return len(self.docs) < before

    def delete_for_review(self, review_id: str) -> None:
        self.docs = [d for d in self.docs if d["review_id"] != review_id]

    def rating_stats(self, restaurant_ids: list[str]) -> list[dict]:
        grouped: dict[str, list[float]] = {}
        for d in self.docs:
            if d["restaurant_id"] in restaurant_ids:
                grouped.setdefault(d["restaurant_id"], []).append(d["rating"])
        return [
            {"restaurant_id": rid, "count": len(rs), "avg_rating": sum(rs) / len(rs)}
            for rid, rs in grouped.items()
        ]

    def max_visited_at_by_restaurant(self, user_id: str, restaurant_ids: list[str]) -> list[dict]:
        best: dict[str, str] = {}
        for d in self.docs:
            if (d["restaurant_id"] in restaurant_ids and d.get("visited_at")
                    and d["user_id"] == user_id):
                rid = d["restaurant_id"]
                best[rid] = max(best[rid], d["visited_at"]) if rid in best else d["visited_at"]
        return [{"restaurant_id": rid, "last_visited": v} for rid, v in best.items()]


class FakeImageRepository(ImageRepository):

    def __init__(self):
        self.docs: list[dict] = []

    def add_review_image(self, image: ReviewImage) -> None:
        self.docs.append(image.model_dump())

    def add_food_review_image(self, image: FoodReviewImage) -> None:
        self.docs.append(image.model_dump())

    def list_by_review(self, review_id: str) -> list[dict]:
        return _copies([d for d in self.docs if d.get("review_id") == review_id])

    def list_by_food_review(self, food_review_id: str) -> list[dict]:
        return _copies([d for d in self.docs if d.get("food_review_id") == food_review_id])

    def delete_by_review(self, review_id: str) -> None:
        self.docs = [d for d in self.docs if d.get("review_id") != review_id]

    def delete_by_food_review(self, food_review_id: str) -> None:
        self.docs = [d for d in self.docs if d.get("food_review_id") != food_review_id]

    def delete_by_food_reviews(self, food_review_ids: list[str]) -> None:
        self.docs = [d for d in self.docs if d.get("food_review_id") not in food_review_ids]


class FakeWishlistRepository(WishlistRepository):

    def __init__(self):
        self.docs: list[dict] = []

    def add(self, entry: WishlistEntry) -> bool:
        self.docs.append(entry.model_dump())
        return True

    def get(self, entry_id: str) -> dict | None:
        return next((dict(d) for d in self.docs if d["entry_id"] == entry_id), None)

    def list_by_user(self, user_id: str) -> list[dict]:
        return _copies([d for d in self.docs if d["user_id"] == user_id])

    def update_comment(self, entry_id: str, comment: str | None) -> bool:
        for d in self.docs:
            if d["entry_id"] == entry_id:
                d["comment"] = comment or None
                return True
        return False

    def delete(self, entry_id: str) -> bool:
        before = len(self.docs)
        self.docs = [d for d in self.docs if d["entry_id"] != entry_id]
        return len(self.docs) < before

    def delete_by_user_and_restaurant(self, user_id: str, restaurant_id: str) -> bool:
        before = len(self.docs)
        self.docs = [d for d in self.docs
                     if not (d["user_id"] == user_id and d["restaurant_id"] == restaurant_id)]
        return len(self.docs) < before


class FakeVisitedRepository(VisitedRepository):

    def __init__(self):
        self.docs: list[dict] = []

    def add(self, entry: VisitedEntry) -> bool:
        # Mirrors the unique index on (user_id, restaurant_id).
        if any(d["user_id"] == entry.user_id and d["restaurant_id"] == entry.restaurant_id
               for d in self.docs):
            raise DuplicateKeyError("visited duplicate")
        self.docs.append(entry.model_dump(mode="json"))
        return True

    def get(self, entry_id: str) -> dict | None:
        return next((dict(d) for d in self.docs if d["entry_id"] == entry_id), None)

    def get_by_user_and_restaurant(self, user_id: str, restaurant_id: str) -> dict | None:
        return next(
            (dict(d) for d in self.docs
             if d["user_id"] == user_id and d["restaurant_id"] == restaurant_id),
            None,
        )

    def list_by_user(self, user_id: str) -> list[dict]:
        return _copies([d for d in self.docs if d["user_id"] == user_id])

    def delete(self, entry_id: str) -> bool:
        before = len(self.docs)
        self.docs = [d for d in self.docs if d["entry_id"] != entry_id]
        return len(self.docs) < before


class FakeUnitOfWork(UnitOfWork):
    """Dict-backed UnitOfWork. Counts transaction outcomes; provides no atomicity."""

    def __init__(self):
        self.users = FakeUserRepository()
        self.friends = FakeFriendRepository()
        self.restaurants = FakeRestaurantRepository()
        self.reviews = FakeReviewRepository()
        self.food_reviews = FakeFoodReviewRepository()
        self.images = FakeImageRepository()
        self.wishlist = FakeWishlistRepository()
        self.visited = FakeVisitedRepository()
        self.commits = 0
        self.rollbacks = 0

    def __enter__(self) -> "FakeUnitOfWork":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if exc_type is not None:
            self.rollbacks += 1
        else:
            self.commits += 1

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1
