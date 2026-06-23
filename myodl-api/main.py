import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
from database.db import init_db

load_dotenv()

from routers import auth, levels, users, lists

app = FastAPI(title="MYODL API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"],
)

app.add_middleware(
    SessionMiddleware, 
    secret_key=os.getenv("SECRET_KEY"),
    max_age=60 * 60 * 24 * 7 # 7 weeks
)

@app.on_event("startup")
async def startup():
    await init_db()

app.include_router(auth.router)
app.include_router(levels.router)
app.include_router(users.router)
app.include_router(lists.router)

@app.get("/", tags=["misc"])
async def root():
    return {"status": "ok"}