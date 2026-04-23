import requests
from loguru import logger
from pymongo.errors import DuplicateKeyError

from src.config import settings
from src.config.place_types import is_food_place
from src.db.mongo_client import get_mongo_collection
from src.utils.wrappers import service
from src.restaurants.models import (
    CreateRestaurantRequest,
    GetRestaurantByIdRequest,
    DeleteRestaurantRequest,
    Restaurant,
    PlaceSearchResult
)

# ------------------- base/core crud ------------------- #

@service
def create_one_restaurant(request: CreateRestaurantRequest, user_id: str) -> str | None:
    """
    Creates a restaurant by fetching details from Google Places using the place ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)

    # Return existing restaurant if already present, updating cuisine_type if needed
    existing = collection.find_one({"google_place_id": request.google_place_id})
    if existing:
        if existing.get("cuisine_type") != request.cuisine_type:
            collection.update_one(
                {"restaurant_id": existing["restaurant_id"]},
                {"$set": {"cuisine_type": request.cuisine_type}},
            )
        return existing["restaurant_id"]

    place_data = _fetch_place_details(request.google_place_id)
    place_data["cuisine_type"] = request.cuisine_type
    place_data["created_by"] = user_id
    restaurant = Restaurant(**place_data)
    try:
        result = collection.insert_one(restaurant.model_dump())
    except DuplicateKeyError:
        existing = collection.find_one({"google_place_id": request.google_place_id})
        return existing["restaurant_id"] if existing else None
    if result.acknowledged:
        return restaurant.restaurant_id
    return None


@service
def get_all_restaurants() -> list[dict]:
    """
    Returns all restaurant entries from the database.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)
    restaurants: list[dict] = list(collection.find({}))
    for restaurant in restaurants:
        restaurant.pop("_id", None)
    return restaurants


@service
def get_restaurant_by_id(request: GetRestaurantByIdRequest) -> dict | None:
    """
    Returns a single restaurant by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)
    restaurant = collection.find_one({"restaurant_id": request.restaurant_id})
    if restaurant:
        assert isinstance(restaurant, dict), "Make sure that the restaurant object is a dictionary."
        restaurant.pop("_id", None)
    return restaurant


@service
def delete_restaurant(request: DeleteRestaurantRequest) -> bool:
    """
    Deletes a restaurant entry by its ID.
    """
    collection = get_mongo_collection(collection_name=settings.mongo_restaurants_collection)
    result = collection.delete_one({"restaurant_id": request.restaurant_id})
    return result.deleted_count > 0


# ------------------- g places search ------------------- #

@service
def search_places(query: str) -> list[PlaceSearchResult]:
    """
    Searches Google Places Autocomplete (New) for restaurants matching the query.
    """
    response = requests.post(
        settings.g_places_autocomplete_url,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.google_api_key,
        },
        json={
            "input": query,
            "locationBias": {
                "circle": {
                    "center": {"latitude": 50.9375, "longitude": 6.9603},
                    "radius": 50000.0,
                }
            },
        },
    )
    data = response.json()
    logger.debug(f"Google Places raw response: {data}")
    suggestions = data.get("suggestions", [])
    results = [
        PlaceSearchResult(
            google_place_id=s["placePrediction"]["placeId"],
            name=s["placePrediction"]["structuredFormat"]["mainText"]["text"],
            address=s["placePrediction"]["structuredFormat"]["secondaryText"]["text"],
        )
        for s in suggestions
        if "placePrediction" in s and is_food_place(s["placePrediction"].get("types"))
    ]
    results = results[:10]
    logger.info(f"Google Places search for '{query}' returned {len(results)} results")
    return results


# ------------------- helpers ------------------- #

def _fetch_place_details(google_place_id: str) -> dict:
    """
    Fetches place details from Google Places API (New) and returns parsed restaurant fields.
    """
    fields = "displayName,formattedAddress,addressComponents,location,types"
    response = requests.get(
        f"{settings.g_places_details_url}/{google_place_id}",
        headers={
            "X-Goog-Api-Key": settings.google_api_key,
            "X-Goog-FieldMask": fields,
        },
    )
    data = response.json()
    if "error" in data:
        raise ValueError(f"Google Places API error: {data['error'].get('message', 'Unknown error')}")

    # Parse address components
    components = {}
    for c in data.get("addressComponents", []):
        for t in c.get("types", []):
            components[t] = c.get("longText", "")

    location = data.get("location", {})

    # Derive cuisine_type from Google's place types (lowercase to match CUISINE_TYPES)
    google_types = set(data.get("types", []))
    cuisine_type = "others"
    type_mapping = {"bakery": "others", "cafe": "cafe", "bar": "bar", "meal_delivery": "others", "meal_takeaway": "others"}
    for gt in google_types:
        if gt in type_mapping:
            cuisine_type = type_mapping[gt]
            break

    return {
        "google_place_id": google_place_id,
        "name": data.get("displayName", {}).get("text", ""),
        "cuisine_type": cuisine_type,
        "street": f"{components.get('route', '')} {components.get('street_number', '')}".strip(),
        "city": components.get("locality", components.get("postal_town", "")),
        "country": components.get("country", ""),
        "latitude": location.get("latitude"),
        "longitude": location.get("longitude"),
    }