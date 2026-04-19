from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from loguru import logger
from slowapi.errors import RateLimitExceeded

from src.config import settings
from src.utils.logger import configure_logger
from src.users import user_router
from src.restaurants.controllers import *
from src.utils.rate_limit import limiter
from src.db.mongo_client import initialize_mongo_client, close_mongo_client
from src.users.services import migrate_friends_add_status


@asynccontextmanager
async def lifespan(app: FastAPI):

    configure_logger()
    logger.info("Starting up the backend application ...")
    initialize_mongo_client()
    migrated = migrate_friends_add_status()
    if migrated:
        logger.info(f"Back-filled status on {migrated} legacy friend connection(s).")
    logger.info("Backend app start up complete.")

    yield
    
    logger.info("Closing up the backend application ...")
    close_mongo_client()
    logger.info("Backend app closed.")


app = FastAPI(title="ResRank Backend", lifespan=lifespan)

app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    lambda request, exc: JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please try again later."},
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.allowed_origins.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(user_router, prefix="/users")
app.include_router(restaurant_router, prefix="/restaurant")
app.include_router(review_router, prefix="/review")
app.include_router(visited_router, prefix="/visited")
app.include_router(wishlist_router, prefix="/wishlist")


@app.get("/", tags=["home"])
def root():
    return {"status": "OK", "message": "Welcome to ResRank Backend"}


@app.get("/health", tags=["home"])
def health_check():
    return {"status": "OK", "message": "ResRank Backend is running smoothly"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
