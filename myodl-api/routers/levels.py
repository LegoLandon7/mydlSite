import aiosqlite
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from database.db import DB
from util.limiter import limiter

router = APIRouter(prefix="/levels", tags=["levels"])

# classes

class Level(BaseModel):
    level_id: int
    name: str
    position: int
    thumbnail_url: str | None = None
    description: str | None = None

# routers

@router.get("/", response_model = list[Level])
@limiter.limit("60/minute")
async def list_levels(request: Request):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM levels ORDER BY position") as c:
            rows = await c.fetchall()

    return [dict(r) for r in rows]


@router.get("/{level_id}", response_model = Level )
@limiter.limit("60/minute")
async def get_level(request: Request, level_id: str):
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