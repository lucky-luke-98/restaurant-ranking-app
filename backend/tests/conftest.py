"""Shared test fixtures.

The environment block MUST run before anything imports ``src`` — ``Settings()`` is
constructed at import time, marks ``mongo_uri``/``google_api_key`` required, and reads
``backend/.env``. Real environment variables take precedence over the .env file, so
setting them here guarantees tests can never touch the Atlas cluster, regardless of
what a developer has in .env.
"""

import os

os.environ["MONGO_URI"] = "mongodb://localhost:27017/?directConnection=true"
os.environ["MONGO_DB"] = "resrank-test"
os.environ["GOOGLE_API_KEY"] = "test-google-key"
os.environ["JWT_SECRET"] = "test-secret"
# Force-empty so agent tests behave identically with and without a developer's .env key:
# "not configured" is the deterministic baseline; tests inject a FakeLlmGateway instead.
os.environ["LLM_API_KEY"] = ""

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.dependencies import get_unit_of_work
from src.utils.auth import get_current_user
from src.utils.rate_limit import limiter
from tests.fakes import FakeUnitOfWork

# In-memory rate-limit counters would couple unrelated tests (everything runs as u-test).
limiter.enabled = False

TEST_USER = {"user_id": "u-test", "role": "user"}


@pytest.fixture
def uow() -> FakeUnitOfWork:
    return FakeUnitOfWork()


def _make_client(uow: FakeUnitOfWork, authenticated: bool) -> TestClient:
    app.dependency_overrides[get_unit_of_work] = lambda: uow
    if authenticated:
        app.dependency_overrides[get_current_user] = lambda: dict(TEST_USER)
    # Deliberately NOT entered as a context manager: that would run the lifespan,
    # which connects to Mongo. Fake-uow tests must stay DB-free.
    return TestClient(app)


@pytest.fixture
def client(uow) -> TestClient:
    """App client authenticated as ``u-test``, all persistence faked."""
    yield _make_client(uow, authenticated=True)
    app.dependency_overrides.clear()


@pytest.fixture
def anon_client(uow) -> TestClient:
    """App client with NO auth override — requests hit the real JWT dependency."""
    yield _make_client(uow, authenticated=False)
    app.dependency_overrides.clear()
