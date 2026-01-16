from pydantic import BaseModel, Field


# ==================== entities ==================== #

class User(BaseModel):
    user_id: str
    first_name: str
    last_name: str
    mail: str


# ==================== requests ==================== #

class CreateUserRequest(BaseModel):
    """Schema for creating a new user."""
    first_name: str = Field(..., description="First name of the user.")
    last_name: str = Field(..., description="Surname of the user.")
    mail: str = Field(..., description="Email address of the user.")


# ==================== responses ==================== #

class GetAllUsersResponse(BaseModel):
    all_users: list[User]

class CreateUserResponse(BaseModel):
    success: bool