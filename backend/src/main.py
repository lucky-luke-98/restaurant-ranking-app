from fastapi import FastAPI
from dotenv import load_dotenv

from src.routers.db_router import db_router


load_dotenv()

app = FastAPI(title="ResRank Backend")

app.include_router(db_router, prefix="/db", tags=["db"])

@app.get("/", tags=["home"])
def root():
    return {"status": "OK", "message": "Welcome to ResRank Backend"}


@app.get("/health", tags=["home"])
def health_check():
    return {"status": "OK", "message": "ResRank Backend is running smoothly"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000)
