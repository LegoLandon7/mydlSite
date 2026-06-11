import aiosqlite
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from database.db import DB
from util.limiter import limiter
from routers.auth import get_session_user

router = APIRouter(prefix="/list", tags=["list"])

# ---------------- LEVELS ----------------

@router.get("/")
@limiter.limit("60/minute")
async def list_levels(request: Request):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM levels ORDER BY position") as c:
            rows = await c.fetchall()

    return [dict(r) for r in rows]


@router.get("/{level_id}")
@limiter.limit("60/minute")
async def get_level(request: Request, level_id: int):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM levels WHERE level_id = ?",
            (level_id,)
        ) as c:
            row = await c.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Level not found")

    return dict(row)


# ---------------- USER LEVELS ----------------

@router.get("/user/{user_id}/levels")
@limiter.limit("60/minute")
async def get_user_levels(request: Request, user_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("""
            SELECT l.*, ul.video_link
            FROM levels l
            JOIN user_levels ul
                ON l.level_id = ul.level_id
            WHERE ul.user_id = ?
            ORDER BY l.position
        """, (user_id,)) as c:
            rows = await c.fetchall()

    return [dict(r) for r in rows]


# ---------------- ADD LEVEL ----------------

class AddLevel(BaseModel):
    level_id: int
    video_link: str | None = None


@router.post("/user/me")
@limiter.limit("30/minute")
async def add_level(request: Request, body: AddLevel):
    user_id = get_session_user(request)

    async with aiosqlite.connect(DB) as db:
        await db.execute("""
            INSERT OR IGNORE INTO user_levels (user_id, level_id, video_link)
            VALUES (?, ?, ?)
        """, (user_id, body.level_id, body.video_link))

        await db.commit()

    return {"success": True}


# ---------------- REMOVE LEVEL ----------------

@router.delete("/user/levels/{level_id}")
@limiter.limit("30/minute")
async def remove_level(request: Request, level_id: int):
    user_id = get_session_user(request)

    async with aiosqlite.connect(DB) as db:
        await db.execute("""
            DELETE FROM user_levels
            WHERE user_id = ? AND level_id = ?
        """, (user_id, level_id))

        await db.commit()

    return {"success": True}

@router.patch("/user/video")
@limiter.limit("20/minute")
async def update_video(request: Request, body: dict):
    user_id = get_session_user(request)

    async with aiosqlite.connect(DB) as db:
        await db.execute("""
            UPDATE user_levels
            SET video_link = ?
            WHERE user_id = ? AND level_id = ?
        """, (body["video_link"], user_id, body["level_id"]))

        await db.commit()

    return {"success": True}