"""FastAPI dependency-injection wiring.

This is the ONLY module that decides which concrete backends the app runs on.
To move from Mongo to (say) SQL you write a new ``UnitOfWork`` subclass and change
``get_unit_of_work`` here — every service and controller stays untouched, because
they depend on the abstractions, not the implementations.

Each request gets a fresh Unit of Work (cheap to construct — no I/O until used),
which FastAPI shares between the services resolved for that request.
"""

from fastapi import Depends, HTTPException

from src.config import settings
from src.unit_of_work import UnitOfWork, MongoUnitOfWork
from src.agent.gateways import LlmGateway, GroqLlmGateway, SttGateway, GroqSttGateway
from src.agent.services.agent_srv import AgentService
from src.agent.services.confirm_srv import ConfirmService
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


def get_llm_gateway() -> LlmGateway:
    # An empty key must never take down the other endpoints — the agent is one
    # endpoint out of 43 and degrades to "assistant unavailable".
    if not settings.llm_api_key:
        raise HTTPException(status_code=503, detail="The assistant is not configured on this server.")
    return GroqLlmGateway()


def get_stt_gateway() -> SttGateway:
    if not settings.llm_api_key:
        raise HTTPException(status_code=503, detail="Transcription is not configured on this server.")
    return GroqSttGateway()


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


def get_agent_service(
    uow: UnitOfWork = Depends(get_unit_of_work),
    llm: LlmGateway = Depends(get_llm_gateway),
) -> AgentService:
    return AgentService(uow, llm)


def get_confirm_service(uow: UnitOfWork = Depends(get_unit_of_work)) -> ConfirmService:
    # Deliberately no LlmGateway dependency: confirming a pending draft must keep
    # working even when the LLM key is missing or the provider is down.
    return ConfirmService(uow)
