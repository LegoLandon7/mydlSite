import os
from datetime import datetime, timedelta, timezone

import aiosqlite
import httpx
from fastapi import APIRouter, Request, HTTPException, Depends, Cookie
from fastapi.responses import JSONResponse, RedirectResponse
from jose import jwt, JWTError
from pydantic import BaseModel
from urllib.parse import quote, unquote

from database.db import DB
from util.limiter import limiter
from routers.users import User

# global

SESSION_EXPIRE_MINUTES = SESSION_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"

DISCORD_API = "https://discord.com/api"
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI")

FRONTEND_URL = os.getenv("FRONTEND_URL")

# classes

from models import *

# helpers

def create_session_token(discord_id: int) -> str:
    expire_time = datetime.now(timezone.utc) + timedelta(minutes=SESSION_EXPIRE_MINUTES)
    payload = {"discord_id": discord_id, "exp": expire_time}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_session_token(token: str) -> Session:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(401, "Invalid or expired session")
    return Session(discord_id=payload["discord_id"])

async def fetch_user(db: aiosqlite.Connection, discord_user: dict) -> User:
    # get discord data
    discord_id = discord_user["id"]
    username = discord_user["username"]

    avatar_hash = discord_user.get("avatar")
    avatar_url = (
        f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar_hash}.png"
        if avatar_hash else None
    )

    # update database
    async with db.execute("SELECT * FROM users WHERE discord_id = ?", (discord_id,),) as c:
        user = await c.fetchone()
    
    if user:
        await db.execute("UPDATE users SET username = ?, avatar_url = ? WHERE discord_id = ?", (username, avatar_url, discord_id),)
    else:
        await db.execute("INSERT INTO users (discord_id, username, avatar_url) VALUES (?, ?, ?)", (discord_id, username, avatar_url),)
    await db.commit()

    # validate user
    async with db.execute("SELECT * FROM users WHERE discord_id = ?", (discord_id,)) as c:
        user = await c.fetchone()

    user_obj = User.model_validate(dict(user))
    return user_obj

async def get_current_user(session: str | None = Cookie(None)) -> User:
    if not session:
        raise HTTPException(401, "Not authenticated")
    
    session_data = decode_session_token(session)

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("SELECT * FROM users WHERE discord_id = ?", (session_data.discord_id,)) as c:
            user = await c.fetchone()
    
    if not user:
        raise HTTPException(401, "User not found")
    
    user_obj = User.model_validate(dict(user))
    return user_obj