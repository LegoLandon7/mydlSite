import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
from database.db import init_db
from routers import list, auth, users

load_dotenv(".env")

app = FastAPI(title="MYODL API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myodl.net"],
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

app.include_router(list.router)
app.include_router(auth.router)
app.include_router(users.router)

@app.get("/")
async def root():
    return {"status": "ok"}

@app.get("/", tags=["misc"])
async def root():
    return {"status": "ok"}