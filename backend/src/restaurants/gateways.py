"""External service gateways for the restaurants domain.

Google Places is an external HTTP dependency, not persistence, so it lives in its
own gateway rather than a repository. Swapping the database has no effect here,
and this can be mocked independently in tests.
"""

import requests
from loguru import logger

from src.config import settings
from src.config.place_types import is_food_place, tags_for_place_types
from src.restaurants.models import PlaceSearchResult


class GooglePlacesError(Exception):
    """Raised when the Google Places API errors out or is unreachable (billing, permissions, network)."""


class AddressNotFoundError(Exception):
    """Raised when a location cannot be resolved to an address (e.g. a pin dropped in open water)."""


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

        return {
            "google_place_id": google_place_id,
            "name": data.get("displayName", {}).get("text", ""),
            "tags": tags_for_place_types(data.get("types")),
            "street": f"{components.get('route', '')} {components.get('street_number', '')}".strip(),
            "city": components.get("locality", components.get("postal_town", "")),
            "country": components.get("country", ""),
            "latitude": location.get("latitude"),
            "longitude": location.get("longitude"),
        }


class NominatimGateway:
    """Talks to OpenStreetMap Nominatim to reverse-geocode a dropped map pin into an address."""

    def reverse_geocode(self, latitude: float, longitude: float) -> dict:
        """Reverse-geocode a pinned location into street/city/country."""
        try:
            response = requests.get(
                settings.nominatim_reverse_url,
                params={
                    "format": "jsonv2",
                    "lat": latitude,
                    "lon": longitude,
                    "zoom": 18,
                    "addressdetails": 1,
                    "accept-language": "en",
                },
                headers={"User-Agent": settings.nominatim_user_agent},
                timeout=10,
            )
        except requests.RequestException as exp:
            logger.error(f"Nominatim reverse geocoding request failed for ({latitude}, {longitude}): {exp}")
            raise AddressNotFoundError("Could not reach the address lookup service.") from exp

        if not response.ok:
            logger.error(
                f"Nominatim reverse geocoding returned HTTP {response.status_code} for ({latitude}, {longitude}): {response.text}"
            )
            raise AddressNotFoundError(
                f"Address lookup is currently unavailable (upstream status {response.status_code})."
            )

        data = response.json()
        address = data.get("address", {})
        if not address:
            logger.info(f"Nominatim found no address for ({latitude}, {longitude}): {data}")
            raise AddressNotFoundError("Could not determine an address for that location. Please try a different spot.")

        street = f"{address.get('road', '')} {address.get('house_number', '')}".strip()
        city = address.get("city") or address.get("town") or address.get("village") or ""
        country = address.get("country", "")

        return {"street": street, "city": city, "country": country}
