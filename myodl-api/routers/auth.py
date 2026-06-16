import os
import aiosqlite
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse
from fastapi import APIRouter, Request, HTTPException, Depends
from fastapi.responses import RedirectResponse, JSONResponse
from authlib.integrations.starlette_client import OAuth
from database.db import DB
from util.limiter import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()

DISCORD_CLIENT_ID     = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
<<<<<<< HEAD
DISCORD_REDIRECT_URI  = os.getenv("DISCORD_REDIRECT_URI")
FRONTEND_URL          = os.getenv("FRONTEND_URL")
ALLOWED_ORIGINS       = set(os.getenv("ALLOWED_ORIGINS", FRONTEND_URL).split(","))
=======
DISCORD_REDIRECT_URI  = os.getenv("DISCORD_REDIRECT_URI", "https://api.myodl.net/auth/callback")
FRONTEND_URL          = os.getenv("FRONTEND_URL", "https://myodl.net")
>>>>>>> 12fe22b8d27dba735bf5824824440d4c4711188e

if not all([DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI, FRONTEND_URL]):
    raise RuntimeError("Missing required environment variables for OAuth")

oauth.register(
    name="discord",
    client_id=DISCORD_CLIENT_ID,
    client_secret=DISCORD_CLIENT_SECRET,
    authorize_url="https://discord.com/api/oauth2/authorize",
    access_token_url="https://discord.com/api/oauth2/token",
    api_base_url="https://discord.com/api/",
    client_kwargs={"scope": "identify"},
)

# How long the /me cache is valid (seconds)
ME_CACHE_TTL = 300  # 5 minutes

def safe_redirect(redirect: str) -> str:
    """Only allow relative paths, never external URLs."""
    if not redirect:
        return "/"
    parsed = urlparse(redirect)
    if parsed.scheme or parsed.netloc:
        return "/"
    # Only allow alphanumeric, slashes, hyphens, underscores
    if not all(c.isalnum() or c in "/-_" for c in redirect):
        return "/"
    return redirect

def get_session_user(request: Request) -> str:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user_id

def check_origin(request: Request):
    origin = request.headers.get("origin", "")
    if not any(origin.startswith(allowed) for allowed in ALLOWED_ORIGINS):
        raise HTTPException(status_code=403, detail="Forbidden")


@router.get("/login")
@limiter.limit("10/minute")
async def login(request: Request, redirect: str = "/"):
    request.session["post_login_redirect"] = safe_redirect(redirect)
    # CSRF token tied to this login attempt
    import secrets
    state = secrets.token_urlsafe(32)
    request.session["oauth_state"] = state
    return await oauth.discord.authorize_redirect(request, DISCORD_REDIRECT_URI)


@router.get("/callback")
@limiter.limit("10/minute")
async def callback(request: Request):
    # Validate CSRF state
    session_state = request.session.pop("oauth_state", None)
    if not session_state:
        return RedirectResponse(url=f"{FRONTEND_URL}?login=failed")

    try:
        token = await oauth.discord.authorize_access_token(request)
        user_resp = await oauth.discord.get("users/@me", token=token)
        user_data = user_resp.json()

        if "id" not in user_data:
            raise ValueError("Invalid user data from Discord")

        discord_id = str(user_data["id"])
        username   = user_data.get("username", "")
        avatar     = user_data.get("avatar")
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

        request.session["user_id"]   = discord_id
        request.session["username"]  = username
        request.session["avatar_url"] = avatar_url
        # Cache timestamp so frontend knows when to refresh
        request.session["cached_at"] = datetime.now(timezone.utc).isoformat()

        redirect = request.session.pop("post_login_redirect", "/")
        return RedirectResponse(url=f"{FRONTEND_URL}{redirect}?login=success")

    except Exception as e:
        print(f"[AUTH ERROR] {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}?login=failed")


@router.get("/me")
@limiter.limit("30/minute")
async def me(request: Request):
    user_id = get_session_user(request)

    # Return cached data if still fresh
    cached_at = request.session.get("cached_at")
    if cached_at:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(cached_at)
        if age < timedelta(seconds=ME_CACHE_TTL):
            return JSONResponse({
                "discord_id": user_id,
                "username":   request.session.get("username"),
                "avatar_url": request.session.get("avatar_url"),
                "cached":     True,
            })

    # Cache expired — fetch fresh from DB
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT discord_id, username, avatar_url FROM users WHERE discord_id = ?", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()

    if not row:
        request.session.clear()
        raise HTTPException(status_code=404, detail="User not found")

    # Refresh session cache
    request.session["username"]  = row["username"]
    request.session["avatar_url"] = row["avatar_url"]
    request.session["cached_at"] = datetime.now(timezone.utc).isoformat()

    return dict(row)


@router.get("/status")
async def status(request: Request):
    user_id = request.session.get("user_id")
    return {"authenticated": user_id is not None}


@router.post("/logout")
@limiter.limit("10/minute")
async def logout(request: Request):
    check_origin(request)
    request.session.clear()
    return {"status": "logged out"}