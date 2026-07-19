"""External service gateways for the restaurants domain.

Google Places is an external HTTP dependency, not persistence, so it lives in its
own gateway rather than a repository. Swapping the database has no effect here,
and this can be mocked independently in tests.
"""

import requests
from loguru import logger

from src.config import settings
from src.config.place_types import is_food_place
from src.restaurants.models import PlaceSearchResult


class GooglePlacesError(Exception):
    """Raised when the Google Places API errors out or is unreachable (billing, permissions, network)."""


class GooglePlacesGateway:
    """Talks to the Google Places API (New) for restaurant search and details."""

    def search(self, query: str) -> list[PlaceSearchResult]:
        """Search Google Places Autocomplete for restaurants matching the query."""
        try:
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
                timeout=10,
            )
        except requests.RequestException as exp:
            logger.error(f"Google Places autocomplete request failed for '{query}': {exp}")
            raise GooglePlacesError("Could not reach the restaurant search service.") from exp

        if not response.ok:
            logger.error(
                f"Google Places autocomplete returned HTTP {response.status_code} for '{query}': {response.text}"
            )
            raise GooglePlacesError(
                f"Restaurant search is currently unavailable (upstream status {response.status_code})."
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

    def fetch_details(self, google_place_id: str) -> dict:
        """Fetch place details and return parsed restaurant fields."""
        fields = "displayName,formattedAddress,addressComponents,location,types"
        try:
            response = requests.get(
                f"{settings.g_places_details_url}/{google_place_id}",
                headers={
                    "X-Goog-Api-Key": settings.google_api_key,
                    "X-Goog-FieldMask": fields,
                },
                timeout=10,
            )
        except requests.RequestException as exp:
            logger.error(f"Google Places details request failed for '{google_place_id}': {exp}")
            raise GooglePlacesError("Could not reach the restaurant details service.") from exp

        if not response.ok:
            logger.error(
                f"Google Places details returned HTTP {response.status_code} for '{google_place_id}': {response.text}"
            )
            raise GooglePlacesError(
                f"Restaurant details are currently unavailable (upstream status {response.status_code})."
            )

        data = response.json()
        if "error" in data:
            logger.error(f"Google Places details error body for '{google_place_id}': {data['error']}")
            raise GooglePlacesError(f"Google Places API error: {data['error'].get('message', 'Unknown error')}")

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
