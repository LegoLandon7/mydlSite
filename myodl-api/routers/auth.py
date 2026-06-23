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

router = APIRouter(prefix="/auth", tags=["auth"])

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

class Session(BaseModel):
    discord_id: int

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

# routers

@router.get("/login")
@limiter.limit("10/minute")
def login(request: Request, redirect: str = "/"):
    url = (
        f"{DISCORD_API}/oauth2/authorize"
        f"?client_id={DISCORD_CLIENT_ID}"
        f"&redirect_uri={DISCORD_REDIRECT_URI}"
        "&response_type=code"
        "&scope=identify"
        f"&state={quote(redirect)}"
    )
    return RedirectResponse(url)

@router.get("/callback")
@limiter.limit("10/minute")
async def callback(request: Request, code: str, state: str | None = "/"):
    redirect_path = state or "/"
    redirect_path = unquote(redirect_path)

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            f"{DISCORD_API}/oauth2/token",
            data={
                "client_id": DISCORD_CLIENT_ID,
                "client_secret": DISCORD_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": DISCORD_REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if token_res.status_code != 200:
            raise HTTPException(400, "Discord token exchange failed")
        access_token = token_res.json()["access_token"]

        user_res = await client.get(
            f"{DISCORD_API}/users/@me",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        if user_res.status_code != 200:
            raise HTTPException(400, "Failed to fetch Discord user")
        discord_user = user_res.json()

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        user = await fetch_user(db, discord_user)

    session_token = create_session_token(user.discord_id)

    response = RedirectResponse(url=f"{FRONTEND_URL}{redirect_path}")
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure=False,  # false for http / local | true for https / public     
        samesite="lax",
        max_age=SESSION_EXPIRE_MINUTES * 60,
    )
    return response

@router.post("/logout")
@limiter.limit("10/minute")
async def logout(request: Request):
    response = JSONResponse({"ok": True})
    response.delete_cookie("session")
    return response


@router.get("/me", response_model=User)
@limiter.limit("60/minute")
async def get_me(request: Request, current_user: User = Depends(get_current_user)):
    return current_user