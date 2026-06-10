from fastapi import APIRouter, Query, HTTPException
import aiosqlite
from database.db import DB

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/")
async def list_users(page: int = Query(1, ge=1)):
    try:
        limit = 10
        offset = (page - 1) * limit

        async with aiosqlite.connect(DB) as db:
            db.row_factory = aiosqlite.Row

            async with db.execute("SELECT COUNT(*) FROM users") as cur:
                row = await cur.fetchone()
                total = row[0] if row else 0

            async with db.execute(
                "SELECT id, username, email, avatar, created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?",
                (limit, offset)
            ) as cur:
                rows = await cur.fetchall()

        return {
            "page": page,
            "total": total,
            "pages": -(-total // limit) if total > 0 else 0,
            "users": [dict(r) for r in rows] if rows else []
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))