import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
from database.db import init_db
from routers import auth, users

load_dotenv(".env.local")

app = FastAPI(title="MYODL API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(SessionMiddleware, secret_key=os.getenv("SECRET_KEY"))

@app.on_event("startup")
async def startup():
    await init_db()

app.include_router(auth.router)
app.include_router(users.router)

@app.get("/")
async def root():
    return {"status": "ok"}

@app.get("/", tags=["misc"])
async def root():
    return {"status": "ok"}