import aiosqlite
from fastapi import APIRouter, HTTPException, Request
from database.db import DB
from util.limiter import limiter

router = APIRouter(prefix="/list", tags=["list"])

@router.get("/")
@limiter.limit("60/minute")
async def list_levels(request: Request):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM levels ORDER BY position") as cursor:
            rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.get("/{level_id}")
@limiter.limit("60/minute")
async def get_level(request: Request, level_id: int):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM levels WHERE level_id = ?", (level_id,)) as cursor:
            row = await cursor.fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Level not found")
    return dict(row)