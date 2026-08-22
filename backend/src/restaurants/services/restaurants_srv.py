"""Restaurant-domain business logic (core CRUD + Google Places search)."""

from src.config.tags import DEFAULT_TAGS, MAX_TAGS_PER_RESTAURANT
from src.db.errors import AlreadyExistsError
from src.unit_of_work import UnitOfWork
from src.restaurants.gateways import GooglePlacesGateway, GooglePlacesError, NominatimGateway  # noqa: F401 (re-export)
from src.restaurants.models import (
    CreateRestaurantRequest,
    CreateManualRestaurantRequest,
    GetRestaurantByIdRequest,
    DeleteRestaurantRequest,
    UpdateRestaurantTagsRequest,
    Restaurant,
    PlaceSearchResult,
)
from src.utils.wrappers import service


class TagNotAllowedError(Exception):
    """Raised when a non-admin tries to introduce a tag that does not exist yet."""


class RestaurantService:
    """Restaurants: creation from Google Places or a manual pin, retrieval, deletion, search."""

    def __init__(self, uow: UnitOfWork, places: GooglePlacesGateway, geocoder: NominatimGateway):
        self._uow = uow
        self._places = places
        self._geocoder = geocoder

    def _assert_tags_allowed(self, tags: list[str], is_admin: bool) -> None:
        """Non-admins may apply any tag that already exists, but may not invent one."""
        if is_admin or not tags:
            return
        unknown = [t for t in tags if t not in DEFAULT_TAGS]
        if not unknown:
            return
        in_use = set(self._uow.restaurants.distinct_tags())
        rejected = [t for t in unknown if t not in in_use]
        if rejected:
            raise TagNotAllowedError(
                f"Only an admin can create new tags: {', '.join(sorted(rejected))}."
            )

    @staticmethod
    def _fit(existing: list[str], additions: list[str]) -> list[str]:
        """Trim additions to what the per-restaurant cap still allows.

        Overflow is dropped rather than raised: the user's intent is to add the
        restaurant to their list, and failing that over a seventh tag is worse
        than quietly keeping the first six.
        """
        room = MAX_TAGS_PER_RESTAURANT - len(existing)
        if room <= 0:
            return []
        return [t for t in additions if t not in existing][:room]

    @service
    def create_one_restaurant(
        self, request: CreateRestaurantRequest, user_id: str, is_admin: bool = False
    ) -> str | None:
        """Create a restaurant by fetching details from Google Places.

        Returns the existing restaurant's id if it already exists, merging the
        submitted tags into whatever is already on it rather than overwriting —
        two users can disagree about a place without clobbering each other.
        """
        self._assert_tags_allowed(request.tags, is_admin)
        existing = self._uow.restaurants.get_by_google_place_id(request.google_place_id)
        if existing:
            additions = self._fit(existing.get("tags") or [], request.tags)
            self._uow.restaurants.add_tags(existing["restaurant_id"], additions)
            return existing["restaurant_id"]

        place_data = self._places.fetch_details(request.google_place_id)
        # The user's own tags win; Google's derived ones only fill the remaining room.
        derived = place_data.get("tags") or []
        place_data["tags"] = request.tags + self._fit(request.tags, derived)
        place_data["created_by"] = user_id
        restaurant = Restaurant(**place_data)
        try:
            self._uow.restaurants.add(restaurant)
        except AlreadyExistsError:
            existing = self._uow.restaurants.get_by_google_place_id(request.google_place_id)
            return existing["restaurant_id"] if existing else None
        return restaurant.restaurant_id

    @service
    def create_manual_restaurant(
        self, request: CreateManualRestaurantRequest, user_id: str, is_admin: bool = False
    ) -> str:
        """Create a restaurant from a user-entered name and a dropped map pin.

        The pin's coordinates are reverse-geocoded via Nominatim to fill in
        street/city/country; the name and coordinates themselves are user input.
        """
        self._assert_tags_allowed(request.tags, is_admin)
        address = self._geocoder.reverse_geocode(request.latitude, request.longitude)
        restaurant = Restaurant(
            name=request.name,
            tags=request.tags,
            street=address["street"],
            city=address["city"],
            country=address["country"],
            latitude=request.latitude,
            longitude=request.longitude,
            created_by=user_id,
        )
        self._uow.restaurants.add(restaurant)
        return restaurant.restaurant_id

    @service
    def get_all_restaurants(self) -> list[dict]:
        """Return all restaurants."""
        return self._uow.restaurants.list_all()

    @service
    def get_restaurant_by_id(self, request: GetRestaurantByIdRequest) -> dict | None:
        """Return a single restaurant by id."""
        return self._uow.restaurants.get(request.restaurant_id)

    @service
    def update_tags(
        self, restaurant_id: str, request: UpdateRestaurantTagsRequest, is_admin: bool = False
    ) -> list[str]:
        """Apply a tag add/remove delta and return the resulting tag list.

        Removal permission is the caller's to enforce — it depends on the
        restaurant's owner, which the controller has already loaded.
        """
        self._assert_tags_allowed(request.add, is_admin)
        current = (self._uow.restaurants.get(restaurant_id) or {}).get("tags") or []
        remaining = [t for t in current if t not in request.remove]
        additions = self._fit(remaining, request.add)
        self._uow.restaurants.remove_tags(restaurant_id, request.remove)
        self._uow.restaurants.add_tags(restaurant_id, additions)
        return remaining + additions

    @service
    def list_tags(self) -> list[str]:
        """Return the selectable vocabulary: the defaults plus every tag in use."""
        return sorted(DEFAULT_TAGS | set(self._uow.restaurants.distinct_tags()))

    @service
    def delete_restaurant(self, request: DeleteRestaurantRequest) -> bool:
        """Delete a restaurant by id."""
        return self._uow.restaurants.delete(request.restaurant_id)

    @service
    def search_places(self, query: str) -> list[PlaceSearchResult]:
        """Search Google Places Autocomplete for restaurants matching the query."""
        return self._places.search(query)
