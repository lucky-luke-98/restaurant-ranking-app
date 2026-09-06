"""Resolve a restaurant name to known restaurants. Read-only."""

from src.agent.models import FindRestaurantArgs
from src.agent.tools.base import Tool

_MAX_MATCHES = 5


class FindRestaurant(Tool):

    name = "find_restaurant"
    description = (
        "Find restaurants known to the app by name, optionally narrowed by city. "
        "Returns candidate matches with their restaurant_id."
    )
    args_model = FindRestaurantArgs

    def run(self, args: FindRestaurantArgs) -> dict:
        needle = args.name.casefold().strip()
        rows = self._uow.restaurants.list_all()
        if args.city:
            city = args.city.casefold().strip()
            rows = [r for r in rows if city in (r.get("city") or "").casefold()]

        exact = [r for r in rows if (r.get("name") or "").casefold().strip() == needle]
        partial = [
            r for r in rows
            if r not in exact and needle in (r.get("name") or "").casefold()
        ]
        matches = (exact + partial)[:_MAX_MATCHES]

        payload: dict = {
            "matches": [
                {
                    "restaurant_id": r["restaurant_id"],
                    "name": r.get("name"),
                    "street": r.get("street"),
                    "city": r.get("city"),
                    "tags": r.get("tags", []),
                }
                for r in matches
            ]
        }
        if not matches:
            # Without this hint a small model invents a plausible-looking uuid.
            payload["hint"] = "No known restaurant matches. Ask the user to add it in the app first."
        elif len(exact) > 1:
            # Never auto-resolve ties (two "Mangal" in one city): a wrong id silently
            # scopes everything downstream to the wrong restaurant.
            payload["needs_disambiguation"] = True
        return payload
