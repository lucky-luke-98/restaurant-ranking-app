from pydantic import BaseModel, Field


# ==================== entities ==================== #

class Restaurant(BaseModel):
    restaurant_id: str
    name: str
    cuisine_type: str
    street: str
    city: str
    country: str

class RestaurantReview(BaseModel):
    review_id: str
    user_id: str
    restaurant_id: str
    cleanliness_rating: float
    experience_rating: int
    comment: str


# ==================== requests ==================== #

class CreateRestaurantRequest(BaseModel):
    name: str = Field(..., description="Name of the restaurant.")
    street: str = Field(..., description="Street name and number of the restaurant in free text form.")
    cuisine_type: str = Field(..., description="The cuisine type of the restaurant.")
    city: str = Field(..., description="City name and possibly zip code of the restaurant in free text form.")
    country: str = Field(..., description="The country of the restaurant.")

class CreateRestaurantReviewRequest(BaseModel):
    user_id: str = Field(..., description="ID of the user submitting the review.")
    restaurant_id: str = Field(..., description="ID of the restaurant being reviewed.")
    cleanliness_rating: float = Field(..., ge=1.0, le=10.0, description="Cleanliness rating given by the user (1 to 10).")
    experience_rating: int = Field(..., ge=1.0, le=10.0, description="Overall experience rating given by the user (1 to 10).")
    comment: str | None = Field(None, description="Optional comment provided by the user.")

class CreateFoodReviewRequest(BaseModel):
    food_name: str = Field(..., description="Name of the food item being reviewed by the user")
    rating: int = Field(..., ge=1, le=10, description="Rating given by the user (1 to 10)")
    comment: str | None = Field(None, description="Optional comment provided by the user")


# ==================== responses ==================== #

class CreateRestaurantResponse(BaseModel):
    success: bool

class CreateRestaurantReviewResponse(BaseModel):
    success: bool