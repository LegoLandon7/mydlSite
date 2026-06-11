import os
import aiosqlite
from urllib.parse import urlparse
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from database.db import DB
from util.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()

DISCORD_CLIENT_ID     = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI  = os.getenv("DISCORD_REDIRECT_URI", "https://api.myodl.net/auth/callback")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "https://myodl.net")

if DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET:
    oauth.register(
        name="discord",
        client_id=DISCORD_CLIENT_ID,
        client_secret=DISCORD_CLIENT_SECRET,
        authorize_url="https://discord.com/api/oauth2/authorize",
        access_token_url="https://discord.com/api/oauth2/token",
        api_base_url="https://discord.com/api/",
        client_kwargs={"scope": "identify"},
    )

def require_oauth():
    if not DISCORD_CLIENT_ID or not DISCORD_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Discord OAuth not configured")

def safe_redirect(redirect: str) -> str:
    parsed = urlparse(redirect)
    if parsed.scheme or parsed.netloc:
        return "/"
    return redirect or "/"

def get_session_user(request: Request) -> str:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id


@router.get("/login")
@limiter.limit("20/minute")
async def login(request: Request, redirect: str = "/"):
    require_oauth()
    request.session["post_login_redirect"] = safe_redirect(redirect)
    return await oauth.discord.authorize_redirect(request, DISCORD_REDIRECT_URI)


@router.get("/callback")
async def callback(request: Request):
    require_oauth()
    try:
        token = await oauth.discord.authorize_access_token(request)
        user_resp = await oauth.discord.get("users/@me", token=token)
        user = user_resp.json()

        discord_id = str(user["id"])
        username   = user.get("username", "")
        avatar     = user.get("avatar")
        avatar_url = f"https://cdn.discordapp.com/avatars/{discord_id}/{avatar}.png" if avatar else None

        async with aiosqlite.connect(DB) as db:
            await db.execute("""
                INSERT INTO users (discord_id, username, avatar_url)
                VALUES (?, ?, ?)
                ON CONFLICT(discord_id) DO UPDATE SET
                    username   = excluded.username,
                    avatar_url = excluded.avatar_url
            """, (discord_id, username, avatar_url))
            await db.commit()

        request.session["user_id"]  = discord_id
        request.session["username"] = username

        redirect = request.session.pop("post_login_redirect", "/")
        return RedirectResponse(url=f"{FRONTEND_URL}{redirect}?login=success")
    except Exception as e:
        print(f"[AUTH ERROR] {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}?login=failed")


@router.get("/me")
async def me(request: Request):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT discord_id, username, avatar_url FROM users WHERE discord_id = ?", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


@router.get("/status")
async def status(request: Request):
    user_id = request.session.get("user_id")
    return {"authenticated": user_id is not None}


@router.post("/logout")
async def logout(request: Request):
    origin = request.headers.get("origin", "")
    if FRONTEND_URL not in origin:
        raise HTTPException(status_code=403, detail="Forbidden")
    request.session.clear()
    return {"status": "logged out"}