from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        frozen=True
    )

    debug: bool = Field(False, description="Whether to use debug logging or not (-> info).")

    # auth
    jwt_secret: str = Field("change-me-in-production", description="Secret key used for signing JWT tokens.")
    jwt_algorithm: str = Field("HS256", description="Algorithm used for JWT encoding.")
    jwt_expiration_minutes: int = Field(1440, description="JWT token expiration time in minutes (default 24h).")

    # google
    google_api_key: str = Field(..., description="Google API key for Places API.")

    # db
    mongo_uri: str = Field(..., description="The mongo db connection string.")
    mongo_db: str = Field(..., description="The database name of the mongo db instance.")
    mongo_users_collection: str = Field("users", description="The name of the collection that stores all users.")
    mongo_restaurants_collection: str = Field("restaurants", description="The name of the collection that stores all users.")
    mongo_reviews_collection: str = Field("reviews", description="The name of the collection that stores all reviews.")
    mongo_wishlist_collection: str = Field("wishlist", description="The name of the collection that stores all wishlist entries.")
    mongo_visited_collection: str = Field("visited", description="The name of the collection that stores all visited entries.")
    mongo_food_reviews_collection: str = Field("food_reviews", description="The name of the collection that stores all food reviews.")

    # cors
    allowed_origins: str = Field(
        "http://localhost:8081,http://localhost:19006",
        description="Comma-separated list of allowed CORS origins.",
    )

settings = Settings()