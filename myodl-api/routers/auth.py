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

from models import *
from core.auth import *

router = APIRouter(prefix="/auth", tags=["auth"])

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
        secure=True,  # false for http / local | true for https / public     
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