from pymongo import MongoClient
from pymongo.collection import Collection

from src.config import settings
from src.utils.logger import logger


class MongoDBClient:

    def __init__(self):
        self._client: MongoClient | None = None
        self._db = None

    def initialize(self):
        """Initialize the MongoDB connection."""
        if not settings.mongo_uri:
            raise ValueError("MongoDB URI must be provided")

        self._client = MongoClient(settings.mongo_uri)
        db_name = settings.mongo_db
        self._db = self._client[db_name]
        logger.info("MongoDB client initialized successfully")

    def close(self):
        if self._client:
            self._client.close()
            self._client = None
            self._db = None

    def get_collection(self, collection_name: str) -> Collection:
        """Return a collection from the active database."""
        if self._db is None:
            raise RuntimeError("MongoDB client is not initialized")
        return self._db[collection_name]


_mongo_client = MongoDBClient()


def initialize_mongo_client():
    """Initialize the global MongoDB client. Call during application startup."""
    _mongo_client.initialize()


def close_mongo_client():
    """Close the global MongoDB client. Call during application shutdown."""
    _mongo_client.close()


def get_mongo_client() -> MongoClient:
    """Return the underlying MongoClient (needed for transactions)."""
    if _mongo_client._client is None:
        raise RuntimeError("MongoDB client is not initialized")
    return _mongo_client._client


def get_mongo_collection(collection_name: str) -> Collection:
    """Get a collection from the global MongoDB client.

    If access fails, attempts to reinitialize the connection once before raising.
    """
    try:
        return _mongo_client.get_collection(collection_name)
    except Exception as exc:
        logger.warning(f"MongoDB access failed ({exc}), attempting to reinitialize")
        try:
            _mongo_client.initialize()
            return _mongo_client.get_collection(collection_name)
        except Exception as reinit_exc:
            logger.error(f"MongoDB reinitialization failed: {reinit_exc}")
            raise RuntimeError(f"MongoDB is unavailable: {reinit_exc}") from reinit_exc
