import os
import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
from database.db import init_db
from aredl.fetch_list import populate_database

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

AREDL_SYNC_INTERVAL = 60 * 60 * 12  # 12 hours

async def aredl_sync_loop():
    while True:
        try:
            await populate_database()
        except Exception as e:
            print(f"[ERROR] AREDL sync failed: {e}")
        await asyncio.sleep(AREDL_SYNC_INTERVAL)

@app.on_event("startup")
async def startup():
    await init_db()
    asyncio.create_task(aredl_sync_loop())

app.include_router(auth.router)
app.include_router(levels.router)
app.include_router(users.router)
app.include_router(lists.router)

@app.get("/", tags=["misc"])
async def root():
    return {"status": "ok"}