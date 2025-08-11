import os
from typing import Optional, Literal
from pydantic import BaseModel

class MongoDBClientSettings(BaseModel):
    """Settings for MongoDB client connection."""
    uri: str = os.getenv("MONGO_URI")
    db_name: str = os.getenv("MONGO_DB_NAME_DEV") if os.getenv("ENV") == "dev" else os.getenv("MONGO_DB_NAME_PROD")
    collection_name: Optional[Literal["restaurants", "reviews", "users"]] = None