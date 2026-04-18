from .restaurants import router as restaurant_router
from .reviews import router as review_router
from .visited import router as visited_router
from .wishlist import router as wishlist_router


__all__ = [
    "restaurant_router",
    "review_router",
    "visited_router",
    "wishlist_router"
]