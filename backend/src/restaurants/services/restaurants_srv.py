"""Restaurant-domain business logic (core CRUD + Google Places search)."""

from src.db.errors import AlreadyExistsError
from src.unit_of_work import UnitOfWork
from src.restaurants.gateways import GooglePlacesGateway, GooglePlacesError  # noqa: F401 (re-export)
from src.restaurants.models import (
    CreateRestaurantRequest,
    GetRestaurantByIdRequest,
    DeleteRestaurantRequest,
    Restaurant,
    PlaceSearchResult,
)
from src.utils.wrappers import service


class RestaurantService:
    """Restaurants: creation from Google Places, retrieval, deletion, search."""

    def __init__(self, uow: UnitOfWork, places: GooglePlacesGateway):
        self._uow = uow
        self._places = places

    @service
    def create_one_restaurant(self, request: CreateRestaurantRequest, user_id: str) -> str | None:
        """Create a restaurant by fetching details from Google Places.

        Returns the existing restaurant's id if it already exists (updating the
        cuisine type when it differs).
        """
        existing = self._uow.restaurants.get_by_google_place_id(request.google_place_id)
        if existing:
            if existing.get("cuisine_type") != request.cuisine_type:
                self._uow.restaurants.set_cuisine_type(existing["restaurant_id"], request.cuisine_type)
            return existing["restaurant_id"]

        place_data = self._places.fetch_details(request.google_place_id)
        place_data["cuisine_type"] = request.cuisine_type
        place_data["created_by"] = user_id
        restaurant = Restaurant(**place_data)
        try:
            self._uow.restaurants.add(restaurant)
        except AlreadyExistsError:
            existing = self._uow.restaurants.get_by_google_place_id(request.google_place_id)
            return existing["restaurant_id"] if existing else None
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
    def delete_restaurant(self, request: DeleteRestaurantRequest) -> bool:
        """Delete a restaurant by id."""
        return self._uow.restaurants.delete(request.restaurant_id)

    @service
    def search_places(self, query: str) -> list[PlaceSearchResult]:
        """Search Google Places Autocomplete for restaurants matching the query."""
        return self._places.search(query)
