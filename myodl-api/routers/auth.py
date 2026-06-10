import os
import aiosqlite
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from database.db import DB

router = APIRouter(prefix="/auth", tags=["auth"])

oauth = OAuth()

DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:8000/auth/callback")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

if DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET:
    oauth.register(
        name="discord",
        client_id=DISCORD_CLIENT_ID,
        client_secret=DISCORD_CLIENT_SECRET,
        authorize_url="https://discord.com/api/oauth2/authorize",
        access_token_url="https://discord.com/api/oauth2/token",
        api_base_url="https://discord.com/api/",
        client_kwargs={"scope": "identify email"},
    )


@router.get("/login")
async def login(request: Request):
    if not DISCORD_CLIENT_ID or not DISCORD_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Discord OAuth not configured")
    return await oauth.discord.authorize_redirect(request, DISCORD_REDIRECT_URI)


@router.get("/callback")
async def callback(request: Request):
    if not DISCORD_CLIENT_ID or not DISCORD_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Discord OAuth not configured")

    try:
        token = await oauth.discord.authorize_access_token(request)
        user_resp = await oauth.discord.get("users/@me", token=token)
        user_data = user_resp.json()

        async with aiosqlite.connect(DB) as db:
            await db.execute("""
                INSERT INTO users (id, username, email, avatar)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    username = excluded.username,
                    email = excluded.email,
                    avatar = excluded.avatar
            """, (
                user_data.get("id"),
                user_data.get("username"),
                user_data.get("email"),
                user_data.get("avatar"),
            ))
            await db.commit()

        user_id_str = str(user_data.get("id"))
        request.session["user_id"] = user_id_str
        request.session["username"] = str(user_data.get("username", ""))
        request.session["email"] = str(user_data.get("email", ""))
        request.session["avatar"] = str(user_data.get("avatar", ""))

        return RedirectResponse(url=f"{FRONTEND_URL}?login=success")
    except Exception as e:
        print(f"Auth error: {e}")
        return RedirectResponse(url=f"{FRONTEND_URL}?login=failed")


@router.get("/me")
async def get_user(request: Request):
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return {
        "id": user_id,
        "username": request.session.get("username"),
        "email": request.session.get("email"),
        "avatar": request.session.get("avatar"),
    }


@router.post("/logout")
async def logout(request: Request):
    request.session.clear()
    return {"status": "logged out"}


@router.get("/status")
async def check_status(request: Request):
    user_id = request.session.get("user_id")
    return {
        "authenticated": user_id is not None,
        "username": request.session.get("username") if user_id else None,
        "email": request.session.get("email") if user_id else None,
        "avatar": request.session.get("avatar") if user_id else None,
    }


@router.get("/me")
async def get_user(request: Request):
    """Get current authenticated user"""
    user_id = request.session.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return {
        "id": user_id,
        "username": request.session.get("username"),
        "email": request.session.get("email"),
        "avatar": request.session.get("avatar"),
    }


@router.post("/logout")
async def logout(request: Request):
    """Logout user"""
    request.session.clear()
    return {"status": "logged out"}


@router.get("/status")
async def check_status(request: Request):
    """Check if user is authenticated"""
    user_id = request.session.get("user_id")
    return {
        "authenticated": user_id is not None,
        "username": request.session.get("username") if user_id else None,
    }
