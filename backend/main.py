from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import CORS_ORIGINS
from db import ping_db
from routers import auth, queries, gmail

app = FastAPI(title="QueryFlow API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(queries.router)
app.include_router(gmail.router)


@app.get("/healthz")
async def health_check():
    db_ok = await ping_db()
    return {
        "status": "ok",
        "db": "connected" if db_ok else "error",
    }


if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
