from uuid import uuid4

from pydantic import BaseModel, Field


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

class RestaurantReview(BaseModel):
    review_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    restaurant_id: str
    cleanliness_rating: float
    experience_rating: int
    comment: str | None

class FoodReview(BaseModel):
    food_review_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    restaurant_id: str
    food_name: str
    price: float
    rating: float
    comment: str | None

class WishlistEntry(BaseModel):
    entry_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    restaurant_id: str

class VisitedEntry(BaseModel):
    entry_id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    restaurant_id: str


# ==================== requests ==================== #

class CreateRestaurantRequest(BaseModel):
    google_place_id: str = Field(..., description="The Google Place ID of the restaurant.")

class CreateRestaurantReviewRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user submitting the review.")
    restaurant_id: str = Field(..., description="ID of the restaurant being reviewed.")
    cleanliness_rating: float = Field(..., ge=0.0, le=10.0, description="Cleanliness rating given by the user (1 to 10).")
    experience_rating: float = Field(..., ge=0.0, le=10.0, description="Overall experience rating given by the user (1 to 10).")
    comment: str | None = Field(None, description="Optional comment provided by the user.")

class CreateFoodReviewRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user submitting the food review.")
    restaurant_id: str = Field(..., description="ID of the restaurant the food belongs to.")
    food_name: str = Field(..., description="Name of the food item being reviewed by the user.")
    price: float = Field(..., gt=0.0, description="The price of the food.")
    rating: float = Field(..., ge=0.0, le=10.0, description="Rating given by the user (1 to 10).")
    comment: str | None = Field(None, description="Optional comment provided by the user.")

class CreateWishlistEntryRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user submitting the review.")
    restaurant_id: str = Field(..., description="ID of the restaurant being reviewed.")

class GetFoodReviewsByRestaurantRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant to get food reviews for.")

class DeleteFoodReviewRequest(BaseModel):
    food_review_id: str = Field(..., description="ID of the food review to delete.")

class GetRestaurantByIdRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant to retrieve.")

class GetReviewsByRestaurantRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant to get reviews for.")

class GetReviewedRestaurantIdsByUserRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user to get reviewed restaurant IDs for.")

class GetWishlistByUserRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user to get wishlist entries for.")

class DeleteRestaurantRequest(BaseModel):
    restaurant_id: str = Field(..., description="ID of the restaurant to delete.")

class DeleteReviewRequest(BaseModel):
    review_id: str = Field(..., description="ID of the review to delete.")

class DeleteWishlistEntryRequest(BaseModel):
    entry_id: str = Field(..., description="ID of the wishlist entry to delete.")

class CreateVisitedEntryRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user.")
    restaurant_id: str = Field(..., description="ID of the restaurant.")

class GetVisitedByUserRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user.")

class DeleteVisitedEntryRequest(BaseModel):
    entry_id: str = Field(..., description="ID of the visited entry to delete.")


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

class CreateWishlistEntryResponse(BaseModel):
    success: bool

class GetWishlistByUserResponse(BaseModel):
    entries: list[dict]

class GetReviewedRestaurantIdsByUserResponse(BaseModel):
    restaurant_ids: list[str]

class DeleteWishlistEntryResponse(BaseModel):
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

class DeleteFoodReviewResponse(BaseModel):
    success: bool