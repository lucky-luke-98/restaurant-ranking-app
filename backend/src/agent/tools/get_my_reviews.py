"""The current user's own food reviews. Read-only, always scoped to self._user_id."""

from src.agent.models import GetMyReviewsArgs
from src.agent.tools.base import Tool

# When filtering by restaurant we fetch a wider window first, then filter and cap —
# filtering after a limit of 5 could return nothing despite matches existing.
_FILTER_FETCH_LIMIT = 25
_COMMENT_MAX_CHARS = 200


class GetMyReviews(Tool):

    name = "get_my_reviews"
    description = (
        "Return the current user's own food reviews (the dishes they rated), newest "
        "first. Optionally filtered to one restaurant_id."
    )
    args_model = GetMyReviewsArgs

    def run(self, args: GetMyReviewsArgs) -> dict:
        fetch = _FILTER_FETCH_LIMIT if args.restaurant_id else args.limit
        rows = self._uow.food_reviews.list_by_user(self._user_id, limit=fetch)
        if args.restaurant_id:
            rows = [r for r in rows if r["restaurant_id"] == args.restaurant_id][: args.limit]

        # Denormalize the restaurant name: the model cannot resolve an id to a name
        # (find_restaurant searches by name), and a second round-trip costs TPM.
        restaurants = self._uow.restaurants.get_many(list({r["restaurant_id"] for r in rows}))
        names = {r["restaurant_id"]: r.get("name") for r in restaurants}

        return {
            "food_reviews": [
                {
                    "restaurant_id": r["restaurant_id"],
                    "restaurant_name": names.get(r["restaurant_id"]),
                    "food_name": r["food_name"],
                    "price": r["price"],
                    "rating": r["rating"],
                    "comment": (r.get("comment") or "")[:_COMMENT_MAX_CHARS] or None,
                    "visited_at": r.get("visited_at"),
                }
                for r in rows
            ]
        }
