import aiosqlite
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator
from database.db import DB
from util.limiter import limiter
from routers.auth import get_session_user

router = APIRouter(prefix="/users", tags=["users"])

VIDEO_LINK_PREFIXES = (
    "https://youtube.com/",
    "https://www.youtube.com/",
    "https://youtu.be/",
    "https://tiktok.com/",
    "https://www.tiktok.com/",
    "https://vm.tiktok.com/",
    "https://twitch.tv/",
    "https://www.twitch.tv/",
    "https://clips.twitch.tv/",
    "https://medal.tv/",
    "https://www.medal.tv/",
    "https://streamable.com/",
    "https://www.streamable.com/",
    "https://bilibili.com/",
    "https://www.bilibili.com/",
    "https://nicovideo.jp/",
    "https://www.nicovideo.jp/",
    "https://odysee.com/",
    "https://www.odysee.com/",
    "https://rumble.com/",
    "https://www.rumble.com/",
)


def validate_video_url(v: str | None) -> str | None:
    if v is None:
        return None
    if not any(v.startswith(p) for p in VIDEO_LINK_PREFIXES):
        raise ValueError("Video link must be from a supported platform (YouTube, TikTok, Twitch, etc.)")
    return v


class AddLevel(BaseModel):
    level_id: int
    video_link: str | None = None
    record: int = 100

    @field_validator("record")
    @classmethod
    def validate_record(cls, v):
        if not 1 <= v <= 100:
            raise ValueError("Record must be between 1 and 100")
        return v

    @field_validator("video_link")
    @classmethod
    def validate_video_link(cls, v):
        return validate_video_url(v)


class UpdateVideo(BaseModel):
    level_id: int
    video_link: str | None = None

    @field_validator("video_link")
    @classmethod
    def validate_video_link(cls, v):
        return validate_video_url(v)


class UpdateRecord(BaseModel):
    level_id: int
    record: int

    @field_validator("record")
    @classmethod
    def validate_record(cls, v):
        if not 1 <= v <= 100:
            raise ValueError("Record must be between 1 and 100")
        return v


class UpdateDescription(BaseModel):
    description: str | None = None

    @field_validator("description")
    @classmethod
    def validate_description(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) > 500:
                raise ValueError("Description must be 500 characters or less")
            if len(v) == 0:
                return None
        return v


@router.get("/")
@limiter.limit("60/minute")
async def get_all_users(request: Request, page: int = 1):
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be 1 or greater")
    offset = (page - 1) * 50
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT COUNT(*) FROM users") as cursor:
            total = (await cursor.fetchone())[0]
        async with db.execute(
            "SELECT discord_id, username, avatar_url, description FROM users LIMIT 50 OFFSET ?", (offset,)
        ) as cursor:
            rows = await cursor.fetchall()
    return {
        "page":        page,
        "per_page":    50,
        "total":       total,
        "total_pages": -(-total // 50),
        "users":       [dict(row) for row in rows]
    }


@router.get("/search")
@limiter.limit("30/minute")
async def search_users(request: Request, q: str):
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="Query too short")
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT discord_id, username, avatar_url, description FROM users WHERE username LIKE ? LIMIT 20",
            (f"%{q}%",)
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.get("/me/levels")
@limiter.limit("60/minute")
async def get_my_levels(request: Request):
    user_id = get_session_user(request)
    return await _get_user_levels(user_id)


@router.get("/{discord_id}")
@limiter.limit("60/minute")
async def get_user(request: Request, discord_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT discord_id, username, avatar_url, description FROM users WHERE discord_id = ?", (discord_id,)
        ) as cursor:
            row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


@router.get("/{discord_id}/levels")
@limiter.limit("60/minute")
async def get_user_levels(request: Request, discord_id: str):
    return await _get_user_levels(discord_id)


@router.patch("/me/description")
@limiter.limit("10/minute")
async def update_description(request: Request, body: UpdateDescription):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "UPDATE users SET description = ? WHERE discord_id = ?",
            (body.description, user_id)
        )
        await db.commit()
    return {"success": True}


async def _get_user_levels(user_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT l.level_id, l.name, l.position, l.link, l.description,
                   ul.video_link, ul.record
            FROM levels l
            JOIN user_list ul ON l.level_id = ul.level_id
            WHERE ul.user_id = ?
            ORDER BY l.position
        """, (user_id,)) as cursor:
            rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/me/levels")
@limiter.limit("30/minute")
async def add_level(request: Request, body: AddLevel):
    user_id = get_session_user(request)

    async with aiosqlite.connect(DB) as db:
        async with db.execute(
            "SELECT level_id FROM levels WHERE level_id = ?", (body.level_id,)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Level not found")

        async with db.execute(
            "SELECT 1 FROM user_list WHERE user_id = ? AND level_id = ?",
            (user_id, body.level_id)
        ) as cursor:
            if await cursor.fetchone():
                raise HTTPException(status_code=409, detail="Level already added")

        await db.execute("""
            INSERT INTO user_list (user_id, level_id, video_link, record)
            VALUES (?, ?, ?, ?)
        """, (user_id, body.level_id, body.video_link, body.record))
        await db.commit()

    return {"success": True}


@router.delete("/me/levels/{level_id}")
@limiter.limit("30/minute")
async def remove_level(request: Request, level_id: int):
    user_id = get_session_user(request)

    async with aiosqlite.connect(DB) as db:
        async with db.execute(
            "SELECT 1 FROM user_list WHERE user_id = ? AND level_id = ?",
            (user_id, level_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Level not in your list")

        await db.execute(
            "DELETE FROM user_list WHERE user_id = ? AND level_id = ?",
            (user_id, level_id)
        )
        await db.commit()

    return {"success": True}


@router.patch("/me/levels/video")
@limiter.limit("20/minute")
async def update_video(request: Request, body: UpdateVideo):
    user_id = get_session_user(request)

    async with aiosqlite.connect(DB) as db:
        async with db.execute(
            "SELECT 1 FROM user_list WHERE user_id = ? AND level_id = ?",
            (user_id, body.level_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Level not in your list")

        await db.execute(
            "UPDATE user_list SET video_link = ? WHERE user_id = ? AND level_id = ?",
            (body.video_link, user_id, body.level_id)
        )
        await db.commit()

    return {"success": True}


@router.patch("/me/levels/record")
@limiter.limit("20/minute")
async def update_record(request: Request, body: UpdateRecord):
    user_id = get_session_user(request)

    async with aiosqlite.connect(DB) as db:
        async with db.execute(
            "SELECT 1 FROM user_list WHERE user_id = ? AND level_id = ?",
            (user_id, body.level_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Level not in your list")

        await db.execute(
            "UPDATE user_list SET record = ? WHERE user_id = ? AND level_id = ?",
            (body.record, user_id, body.level_id)
        )
        await db.commit()

    return {"success": True}