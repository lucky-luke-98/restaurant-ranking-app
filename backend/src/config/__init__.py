from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        frozen=True
    )

    mongo_uri: str = Field(..., description="The mongo db connection string.")
    mongo_db_dev: str = Field(..., description="The database name of the mongo db instance for the dev-stage.")
    mongo_db_prod: str = Field(..., description="The database name of the mongo db instance for the prod-stage.")
    mongo_users_collection: str = Field("users", description="The name of the collection that stores all users.")
    mongo_restaurants_collection: str = Field("restaurants", description="The name of the collection that stores all users.")
    mongo_reviews_collectino: str = Field("reviews", description="The name of the collection that stores all reviews.")

settings = Settings()