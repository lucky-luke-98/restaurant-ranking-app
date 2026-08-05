"""FastAPI dependency-injection wiring.

This is the ONLY module that decides which concrete backends the app runs on.
To move from Mongo to (say) SQL you write a new ``UnitOfWork`` subclass and change
``get_unit_of_work`` here — every service and controller stays untouched, because
they depend on the abstractions, not the implementations.

Each request gets a fresh Unit of Work (cheap to construct — no I/O until used),
which FastAPI shares between the services resolved for that request.
"""

from fastapi import Depends

from src.unit_of_work import UnitOfWork, MongoUnitOfWork
from src.restaurants.gateways import GooglePlacesGateway, NominatimGateway
from src.users.services import UserService, FriendService
from src.restaurants.services.restaurants_srv import RestaurantService
from src.restaurants.services.reviews_srv import ReviewService, FoodReviewService
from src.restaurants.services.visited_srv import VisitedService
from src.restaurants.services.wishlist_srv import WishlistService


# ---- backends (swap these to change the persistence / external stack) ----

def get_unit_of_work() -> UnitOfWork:
    return MongoUnitOfWork()


def get_places_gateway() -> GooglePlacesGateway:
    return GooglePlacesGateway()


def get_geocoder_gateway() -> NominatimGateway:
    return NominatimGateway()


# ---- services (depend only on the abstractions above) ----

def get_user_service(uow: UnitOfWork = Depends(get_unit_of_work)) -> UserService:
    return UserService(uow)


def get_friend_service(uow: UnitOfWork = Depends(get_unit_of_work)) -> FriendService:
    return FriendService(uow)


def get_restaurant_service(
    uow: UnitOfWork = Depends(get_unit_of_work),
    places: GooglePlacesGateway = Depends(get_places_gateway),
    geocoder: NominatimGateway = Depends(get_geocoder_gateway),
) -> RestaurantService:
    return RestaurantService(uow, places, geocoder)


def get_review_service(uow: UnitOfWork = Depends(get_unit_of_work)) -> ReviewService:
    return ReviewService(uow)


def get_food_review_service(uow: UnitOfWork = Depends(get_unit_of_work)) -> FoodReviewService:
    return FoodReviewService(uow)


def get_visited_service(uow: UnitOfWork = Depends(get_unit_of_work)) -> VisitedService:
    return VisitedService(uow)


def get_wishlist_service(uow: UnitOfWork = Depends(get_unit_of_work)) -> WishlistService:
    return WishlistService(uow)
