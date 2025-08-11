from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field


class FoodReviewRequest(BaseModel):
    """Schema for a review request of food used as api endpoint input."""
    food_name: str = Field(..., description="Name of the food item being reviewed by the user")
    rating: int = Field(..., ge=1, le=10, description="Rating given by the user (1 to 10)")
    comment: Optional[str] = Field(None, description="Optional comment provided by the user")

class RestaurantReviewRequest(BaseModel):
    """Schema for a review request of a restaurant used as api endpoint input."""
    user_id: str = Field(..., description="ID of the user submitting the review.")
    restaurant_id: str = Field(..., description="ID of the restaurant being reviewed.")
    cleanliness_rating: float = Field(..., ge=1.0, le=10.0, description="Cleanliness rating given by the user (1 to 10).")
    experience_rating: int = Field(..., ge=1.0, le=10.0, description="Overall experience rating given by the user (1 to 10).")
    comment: Optional[str] = Field(None, description="Optional comment provided by the user.")
    food_review: FoodReviewRequest = Field(..., description="Review of the food that the user had.")

class UserCreateRequest(BaseModel):
    """Schema for creating a new user."""
    first_name: str = Field(..., description="First name of the user.")
    last_name: str = Field(..., description="Surname of the user.")
    birthdate: datetime = Field(..., description="Birthdate of the user in datetime format.")
    mail: str = Field(..., description="Email address of the user.")

class RestaurantCreateRequest(BaseModel):
    """Schema for creating a new restaurant."""
    name: str = Field(..., description="Name of the restaurant.")
    cuisine_type: str = Field(..., description="Type of cuisine served at the restaurant.")
    city: str = Field(..., description="City of the restaurant.")
    street: Optional[str] = Field(None, description="Street address of the restaurant.")