from src.utils.logger import configure_logger
configure_logger()

from fastapi import FastAPI
from dotenv import load_dotenv

from src.users import user_router
from src.restaurants import restaurant_router

load_dotenv()


app = FastAPI(title="ResRank Backend")

# ======================= append all routers ======================= #

app.include_router(user_router, prefix="/users")
app.include_router(restaurant_router, prefix="/restaurant")

# ======================= some basic endpoints ======================= #

@app.get("/", tags=["home"])
def root():
    return {"status": "OK", "message": "Welcome to ResRank Backend"}


@app.get("/health", tags=["home"])
def health_check():
    return {"status": "OK", "message": "ResRank Backend is running smoothly"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
