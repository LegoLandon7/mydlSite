import aiosqlite
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from database.db import DB
from util.limiter import limiter
from routers.auth import get_session_user

router = APIRouter(prefix="/levels", tags=["levels"])

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

