import aiosqlite
from fastapi import APIRouter, HTTPException, Request
from database.db import DB
from util.limiter import limiter

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/")
@limiter.limit("10/minute")
async def get_all_users(request: Request, page: int = 1):
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be 1 or greater")
    offset = (page - 1) * 50
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT COUNT(*) FROM users") as cursor:
            total = (await cursor.fetchone())[0]
        async with db.execute(
            "SELECT discord_id, username, avatar_url FROM users LIMIT 50 OFFSET ?", (offset,)
        ) as cursor:
            rows = await cursor.fetchall()
    return {
        "page":       page,
        "per_page":   50,
        "total":      total,
        "total_pages": -(-total // 50),
        "users":      [dict(row) for row in rows]
    }


@router.get("/search")
@limiter.limit("30/minute")
async def search_users(request: Request, q: str):
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="Query too short")
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT discord_id, username, avatar_url FROM users WHERE username LIKE ? LIMIT 20",
            (f"%{q}%",)
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.get("/{discord_id}")
@limiter.limit("30/minute")
async def get_user(request: Request, discord_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT discord_id, username, avatar_url FROM users WHERE discord_id = ?", (discord_id,)
        ) as cursor:
            row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)