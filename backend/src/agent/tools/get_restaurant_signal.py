"""Aggregated cross-user rating signal for one restaurant. Read-only."""

from src.agent.models import GetRestaurantSignalArgs
from src.agent.tools.base import Tool

# With three users, an "aggregate" of one review IS one identifiable person's rating —
# and this is a cross-user tool. Below this count the average is suppressed.
_MIN_COUNT_FOR_AVG = 2


class GetRestaurantSignal(Tool):

    name = "get_restaurant_signal"
    description = (
        "Aggregated food-rating signal for one restaurant across all users: how many "
        "dish ratings exist and their average. The average is null when fewer than two "
        "ratings exist."
    )
    args_model = GetRestaurantSignalArgs

    def run(self, args: GetRestaurantSignalArgs) -> dict:
        stats = self._uow.food_reviews.rating_stats([args.restaurant_id])
        if not stats:
            return {"restaurant_id": args.restaurant_id, "rating_count": 0, "avg_rating": None}
        entry = stats[0]
        avg = round(entry["avg_rating"], 1) if entry["count"] >= _MIN_COUNT_FOR_AVG else None
        return {
            "restaurant_id": args.restaurant_id,
            "rating_count": entry["count"],
            "avg_rating": avg,
        }
