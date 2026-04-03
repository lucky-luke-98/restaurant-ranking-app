from uuid import uuid4
from typing import Literal

from pydantic import BaseModel, Field


# ==================== entities ==================== #

class User(BaseModel):
    user_id: str = Field(default_factory=lambda: str(uuid4()), description="Unique identifier for user.")
    first_name: str = Field(..., description="First name of the user.")
    last_name: str = Field(..., description="Surname of the user.")
    mail: str = Field(..., description="Email address of the user.")
    password_hash: str = Field(..., description="Bcrypt hash of the user's password.")
    role: Literal["admin", "default"] = Field("default", description="Role of the user in the application.")


# ==================== requests ==================== #

class CreateUserRequest(BaseModel):
    """Schema for creating a new user."""
    first_name: str = Field(..., description="First name of the user to create.")
    last_name: str = Field(..., description="Surname of the user to create.")
    mail: str = Field(..., description="Email address of the user to create.")
    role: Literal["admin", "default"] = Field("default", description="Role of the user to create.")

class RegisterRequest(BaseModel):
    first_name: str = Field(..., description="First name of the new user.")
    last_name: str = Field(..., description="Surname of the new user.")
    mail: str = Field(..., description="Email address (used as login).")
    password: str = Field(..., min_length=6, description="Plain-text password (min 6 chars).")

class LoginRequest(BaseModel):
    mail: str = Field(..., description="Email address.")
    password: str = Field(..., description="Plain-text password.")


# ==================== responses ==================== #

class GetAllUsersResponse(BaseModel):
    all_users: list[dict] = Field([], description="The list of all users found.")

class CreateUserResponse(BaseModel):
    success: bool

class AuthResponse(BaseModel):
    access_token: str
    user_id: str
    mail: str
    first_name: str
    last_name: str
    role: str
