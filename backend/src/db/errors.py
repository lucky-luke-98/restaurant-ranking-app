"""Storage-agnostic exceptions raised by repository adapters.

These let services and controllers react to persistence outcomes without
importing anything driver-specific (e.g. pymongo's DuplicateKeyError). A future
SQL adapter raises the same exceptions, so nothing above the adapter changes.
"""


class RepositoryError(Exception):
    """Base class for all repository-level errors."""


class AlreadyExistsError(RepositoryError):
    """Raised when inserting a record that violates a uniqueness constraint."""
