from pydantic import BaseModel, Field
from datetime import datetime

from src.schemas.requests import UserCreateRequest, RestaurantReviewRequest

class UserDBEntry(UserCreateRequest):
    """Schema for the user db entries."""
    user_id: str = Field(..., description="Unique identifier for the user.")

class ReviewDBEntry(RestaurantReviewRequest):
    """Schema for the review db entries."""
    review_id: str = Field(..., description="Unique identifier for the review.")