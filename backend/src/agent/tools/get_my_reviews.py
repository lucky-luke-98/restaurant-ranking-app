"""The current user's own food reviews. Read-only, always scoped to self._user_id."""

import unicodedata

from src.agent.models import GetMyReviewsArgs
from src.agent.tools.base import Tool

# When filtering (by restaurant or dish query) we fetch the user's whole history first,
# then filter and cap — filtering after a limit of 5 newest would miss older matches,
# which is exactly the "you have no döner reviews" failure. ~100 rows of projected keys
# is nothing at this corpus size; the LIMIT on what reaches the prompt still applies.
_FILTER_FETCH_LIMIT = 200
_COMMENT_MAX_CHARS = 200


def _normalize(text: str) -> str:
    """Casefold and strip diacritics so 'Döner', 'döner' and 'doner' all match."""
    decomposed = unicodedata.normalize("NFKD", text.casefold())
    return "".join(ch for ch in decomposed if not unicodedata.combining(ch))


class GetMyReviews(Tool):

    name = "get_my_reviews"
    description = (
        "Return the current user's own food reviews (the dishes they rated), newest "
        "first. Filter by restaurant_id, or search all their dishes with food_query."
    )
    args_model = GetMyReviewsArgs

    def run(self, args: GetMyReviewsArgs) -> dict:
        filtered = bool(args.restaurant_id or args.food_query)
        fetch = _FILTER_FETCH_LIMIT if filtered else args.limit
        rows = self._uow.food_reviews.list_by_user(self._user_id, limit=fetch)
        if args.restaurant_id:
            rows = [r for r in rows if r["restaurant_id"] == args.restaurant_id]
        if args.food_query:
            needle = _normalize(args.food_query)
            rows = [r for r in rows if needle in _normalize(r.get("food_name") or "")]
        rows = rows[: args.limit]

        # Denormalize restaurant name and city: the model cannot resolve an id to a name
        # (find_restaurant searches by name), and a second round-trip costs TPM.
        restaurants = self._uow.restaurants.get_many(list({r["restaurant_id"] for r in rows}))
        places = {r["restaurant_id"]: r for r in restaurants}

        return {
            "food_reviews": [
                {
                    "restaurant_id": r["restaurant_id"],
                    "restaurant_name": places.get(r["restaurant_id"], {}).get("name"),
                    "city": places.get(r["restaurant_id"], {}).get("city"),
                    "food_name": r["food_name"],
                    "price": r["price"],
                    "rating": r["rating"],
                    "comment": (r.get("comment") or "")[:_COMMENT_MAX_CHARS] or None,
                    "visited_at": r.get("visited_at"),
                }
                for r in rows
            ]
        }
