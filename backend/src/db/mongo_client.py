from pymongo import MongoClient, ASCENDING
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

        # Close any previous client first: the reinit path in get_mongo_collection would
        # otherwise leak a full connection pool per recovery against Atlas M0's 500 cap.
        self.close()
        self._client = MongoClient(settings.mongo_uri)
        db_name = settings.mongo_db
        self._db = self._client[db_name]
        try:
            self._ensure_indexes()
        except Exception as exc:
            # A failing index build (e.g. duplicates, options conflict) must never
            # brick startup — the app works without indexes, just without the guarantees.
            logger.error(f"Index creation failed, continuing without: {exc}")
        logger.info("MongoDB client initialized successfully")

    def _ensure_indexes(self):
        """Create the indexes the app relies on for integrity and lookup."""
        if self._db is None:
            return
        self._db[settings.mongo_users_collection].create_index(
            [("mail", ASCENDING)], unique=True
        )
        self._db[settings.mongo_restaurants_collection].create_index(
            [("google_place_id", ASCENDING)],
            unique=True,
            partialFilterExpression={"google_place_id": {"$type": "string"}},
        )
        self._db[settings.mongo_restaurants_collection].create_index([("tags", ASCENDING)])
        self._db[settings.mongo_reviews_collection].create_index(
            [("review_id", ASCENDING)],
            unique=True,
            partialFilterExpression={"review_id": {"$type": "string"}},
        )
        self._db[settings.mongo_food_reviews_collection].create_index(
            [("food_review_id", ASCENDING)],
            unique=True,
            partialFilterExpression={"food_review_id": {"$type": "string"}},
        )
        self._db[settings.mongo_visited_collection].create_index(
            [("user_id", ASCENDING), ("restaurant_id", ASCENDING)],
            unique=True,
            partialFilterExpression={
                "user_id": {"$type": "string"},
                "restaurant_id": {"$type": "string"},
            },
        )

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
