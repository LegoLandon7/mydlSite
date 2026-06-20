import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.middleware.sessions import SessionMiddleware
from dotenv import load_dotenv
from database.db import init_db

load_dotenv()

from routers import levels, auth, users, submissions, notifications

app = FastAPI(title="MYODL API", version="1.0.0", docs_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myodl.net", "http://localhost:5173", "http://127.0.0.1:5173"],
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

app.include_router(levels.router)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(notifications.router)
app.include_router(submissions.router)

@app.get("/", tags=["misc"])
async def root():
    return {"status": "ok"}

@app.get("/docs")
async def docs():
    return FileResponse("docs.html")