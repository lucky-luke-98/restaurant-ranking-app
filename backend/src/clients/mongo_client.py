from pymongo import MongoClient

from src.schemas.settings import MongoDBClientSettings
from src.utils.logger import logger


class MongoDBClient:

    def __init__(self, settings: MongoDBClientSettings):
        """Initialize MongoDB client with provided settings."""
        self.settings = settings
        
        if not settings.uri:
            raise ValueError("MongoDB URI must be provided")
        assert settings.collection_name is not None, "Collection name must be specified"
        
        try:
            self.client = MongoClient(settings.uri)
            self.db = self.client[settings.db_name]
            self.collection = self.db[settings.collection_name]
        except Exception as exp:
            logger.error(f"Failed to connect to MongoDB: {exp}")
            raise Exception(f"Failed to connect to MongoDB: {exp}")
        
        logger.info("MongoDB client initialized successfully")

    def close(self):
        self.client.close()

def get_mongo_client(**kwargs):
    """Get a MongoDB client instance with the provided settings."""
    settings = MongoDBClientSettings(**kwargs)
    return MongoDBClient(settings=settings)