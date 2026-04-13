import re
from datetime import date, datetime, timezone
from uuid import uuid4

from pydantic import BaseModel, Field, field_validator

from src.config import settings


# ==================== entities ==================== #

class Restaurant(BaseModel):
    restaurant_id: str = Field(default_factory=lambda: str(uuid4()))
    google_place_id: str
    name: str
    cuisine_type: str
    street: str
    city: str
    country: str
    latitude: float | None = None
    longitude: float | None = None
    created_by: str | None = None

class RestaurantReview(BaseModel):
    review_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    restaurant_id: str
    cleanliness_rating: float
    experience_rating: float
    comment: str | None = Field(None, max_length=settings.review_comment_max_length)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = None
    visited_at: date | None = None

class FoodReview(BaseModel):
    food_review_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    restaurant_id: str
    food_name: str
    price: float
    rating: float
    comment: str | None = Field(None, max_length=settings.review_comment_max_length)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime | None = None
    visited_at: date | None = None

class ReviewImage(BaseModel):
    image_id: str = Field(default_factory=lambda: str(uuid4()))
    review_id: str
    data: str  # base64-encoded image
    content_type: str = "image/jpeg"

class FoodReviewImage(BaseModel):
    image_id: str = Field(default_factory=lambda: str(uuid4()))
    food_review_id: str
    data: str  # base64-encoded image
    content_type: str = "image/jpeg"

class WishlistEntry(BaseModel):
    entry_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    restaurant_id: str
    comment: str | None = None

class VisitedEntry(BaseModel):
    entry_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    restaurant_id: str


# ==================== requests ==================== #

_PLACE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{20,}$")


CUISINE_TYPES = [
    "brewery", "bar", "cafe", "italian", "japanese", "chinese", "asian",
    "indian", "mexican", "greek", "oriental", "burger", "sandwiches",
    "bbq", "fusion", "others",
]

class CreateRestaurantRequest(BaseModel):
    google_place_id: str = Field(..., description="The Google Place ID of the restaurant.")
    cuisine_type: str = Field("others", description="Cuisine type chosen by the user.")

    @field_validator("google_place_id")
    @classmethod
    def validate_google_place_id(cls, v: str) -> str:
        if not _PLACE_ID_RE.match(v):
            raise ValueError("Invalid Google Place ID format.")
        return v

    @field_validator("cuisine_type")
    @classmethod
    def validate_cuisine_type(cls, v: str) -> str:
        if v not in CUISINE_TYPES:
            raise ValueError(f"Invalid cuisine type. Must be one of: {', '.join(CUISINE_TYPES)}")
        return v

class CreateRestaurantReviewRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant being reviewed.")
    cleanliness_rating: float = Field(..., ge=0.0, le=10.0, description="Cleanliness rating given by the user (1 to 10).")
    experience_rating: float = Field(..., ge=0.0, le=10.0, description="Overall experience rating given by the user (1 to 10).")
    comment: str | None = Field(None, max_length=settings.review_comment_max_length, description="Optional comment provided by the user.")
    visited_at: date | None = Field(None, description="Optional date when the restaurant was visited.")
    coauthor_ids: list[str] = Field(default_factory=list, description="User IDs of friends who co-authored this review.")
    images: list[str] = Field(default_factory=list, description="List of base64-encoded images.")

class CreateFoodReviewRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant the food belongs to.")
    food_name: str = Field(..., description="Name of the food item being reviewed by the user.")
    price: float = Field(..., gt=0.0, description="The price of the food.")
    rating: float = Field(..., ge=0.0, le=10.0, description="Rating given by the user (1 to 10).")
    comment: str | None = Field(None, max_length=settings.review_comment_max_length, description="Optional comment provided by the user.")
    images: list[str] = Field(default_factory=list, description="List of base64-encoded images.")
    visited_at: date | None = Field(None, description="Optional date when the restaurant was visited.")

class UpdateRestaurantReviewRequest(BaseModel):
    review_id: str = Field(..., description="ID of the review to update.")
    cleanliness_rating: float | None = Field(None, ge=0.0, le=10.0, description="Updated cleanliness rating.")
    experience_rating: float | None = Field(None, ge=0.0, le=10.0, description="Updated experience rating.")
    comment: str | None = Field(None, max_length=settings.review_comment_max_length, description="Updated comment.")
    visited_at: date | None = Field(None, description="Updated visit date.")
    coauthor_ids: list[str] | None = Field(None, description="Updated list of coauthor user IDs.")
    images: list[str] | None = Field(None, description="Updated list of base64-encoded images. If provided, replaces the full existing set.")

class UpdateFoodReviewRequest(BaseModel):
    food_review_id: str = Field(..., description="ID of the food review to update.")
    food_name: str | None = Field(None, description="Updated food name.")
    price: float | None = Field(None, gt=0.0, description="Updated price.")
    rating: float | None = Field(None, ge=0.0, le=10.0, description="Updated rating.")
    comment: str | None = Field(None, max_length=settings.review_comment_max_length, description="Updated comment.")
    visited_at: date | None = Field(None, description="Updated visit date.")

class CreateWishlistEntryRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant.")
    comment: str | None = Field(None, max_length=400, description="Optional note on why you want to visit.")

class UpdateWishlistEntryRequest(BaseModel):
    entry_id: str = Field(..., description="ID of the wishlist entry to update.")
    comment: str | None = Field(None, max_length=400, description="Updated comment. Pass empty string or null to clear.")

class GetFoodReviewsByRestaurantRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant to get food reviews for.")

class DeleteFoodReviewRequest(BaseModel):
    food_review_id: str = Field(..., description="ID of the food review to delete.")

class GetRestaurantByIdRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant to retrieve.")

class GetReviewsByRestaurantRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant to get reviews for.")

class GetReviewedRestaurantIdsByUserRequest(BaseModel):
    user_id: str

class GetWishlistByUserRequest(BaseModel):
    user_id: str

class DeleteRestaurantRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant to delete.")

class DeleteReviewRequest(BaseModel):
    review_id: str = Field(..., description="ID of the review to delete.")

class DeleteWishlistEntryRequest(BaseModel):
    entry_id: str = Field(..., description="ID of the wishlist entry to delete.")

class CreateVisitedEntryRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant.")

class GetVisitedByUserRequest(BaseModel):
    user_id: str

class DeleteVisitedEntryRequest(BaseModel):
    entry_id: str = Field(..., description="ID of the visited entry to delete.")

class LeaveReviewResponse(BaseModel):
    success: bool


# ==================== responses ==================== #

class PlaceSearchResult(BaseModel):
    google_place_id: str
    name: str
    address: str

class SearchPlacesResponse(BaseModel):
    results: list[PlaceSearchResult]

class CreateRestaurantResponse(BaseModel):
    restaurant_id: str
    success: bool

class GetAllRestaurantsResponse(BaseModel):
    restaurants: list[dict]

class GetRestaurantByIdResponse(BaseModel):
    restaurant: dict | None

class DeleteRestaurantResponse(BaseModel):
    success: bool

class CreateRestaurantReviewResponse(BaseModel):
    success: bool

class GetReviewsByRestaurantResponse(BaseModel):
    reviews: list[dict]

class DeleteReviewResponse(BaseModel):
    success: bool

class UpdateRestaurantReviewResponse(BaseModel):
    success: bool

class UpdateFoodReviewResponse(BaseModel):
    success: bool

class CreateWishlistEntryResponse(BaseModel):
    success: bool

class GetWishlistByUserResponse(BaseModel):
    entries: list[dict]

class GetReviewedRestaurantIdsByUserResponse(BaseModel):
    restaurant_ids: list[str]

class DeleteWishlistEntryResponse(BaseModel):
    success: bool

class UpdateWishlistEntryResponse(BaseModel):
    success: bool

class CreateVisitedEntryResponse(BaseModel):
    success: bool

class GetVisitedByUserResponse(BaseModel):
    entries: list[dict]

class DeleteVisitedEntryResponse(BaseModel):
    success: bool

class CreateFoodReviewResponse(BaseModel):
    success: bool

class GetFoodReviewsByRestaurantResponse(BaseModel):
    food_reviews: list[dict]

class FoodReviewStatsEntry(BaseModel):
    restaurant_id: str
    count: int
    avg_rating: float | None
    last_visited: str | None = None

class GetFoodReviewStatsResponse(BaseModel):
    stats: list[FoodReviewStatsEntry]

class DeleteFoodReviewResponse(BaseModel):
    success: bool