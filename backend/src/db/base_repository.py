"""Shared plumbing for Mongo repository adapters.

Every Mongo adapter needs two things: its collection, and the currently-active
session (so its writes join an open Unit-of-Work transaction, or run standalone
when there is none). Both are resolved lazily so a repository can be constructed
on the event loop while the actual I/O happens later inside ``to_thread``.
"""

from typing import Callable

from pymongo.client_session import ClientSession
from pymongo.collection import Collection

from src.db.mongo_client import get_mongo_collection

# Returns the session of an open Unit of Work, or ``None`` when unscoped.
SessionProvider = Callable[[], ClientSession | None]


class MongoRepository:
    """Base for Mongo adapters: exposes ``_collection`` and the active ``_session``."""

    def __init__(self, collection_name: str, session_provider: SessionProvider | None = None):
        self._collection_name = collection_name
        self._session_provider: SessionProvider = session_provider or (lambda: None)

    @property
    def _collection(self) -> Collection:
        return get_mongo_collection(self._collection_name)

    @property
    def _session(self) -> ClientSession | None:
        return self._session_provider()
