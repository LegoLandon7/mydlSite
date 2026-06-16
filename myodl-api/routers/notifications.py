import aiosqlite
from fastapi import APIRouter, HTTPException, Request
from database.db import DB
from util.limiter import limiter
from routers.auth import get_session_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("/")
@limiter.limit("60/minute")
async def get_notifications(request: Request, page: int = 1, unread_only: bool = False):
    user_id = get_session_user(request)
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be 1 or greater")
    offset = (page - 1) * 50
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        if unread_only:
            count_query = "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read = 0"
            count_params = (user_id,)
            rows_query = """
                SELECT n.notif_id, n.type, n.group_id, n.submission_id, n.read, n.created_at,
                       g.name as group_name,
                       s.level_id, s.record, s.status as submission_status,
                       l.name as level_name
                FROM notifications n
                LEFT JOIN groups g ON g.group_id = n.group_id
                LEFT JOIN submissions s ON s.submission_id = n.submission_id
                LEFT JOIN levels l ON l.level_id = s.level_id
                WHERE n.user_id = ? AND n.read = 0
                ORDER BY n.created_at DESC
                LIMIT 50 OFFSET ?
            """
            rows_params = (user_id, offset)
        else:
            count_query = "SELECT COUNT(*) FROM notifications WHERE user_id = ?"
            count_params = (user_id,)
            rows_query = """
                SELECT n.notif_id, n.type, n.group_id, n.submission_id, n.read, n.created_at,
                       g.name as group_name,
                       s.level_id, s.record, s.status as submission_status,
                       l.name as level_name
                FROM notifications n
                LEFT JOIN groups g ON g.group_id = n.group_id
                LEFT JOIN submissions s ON s.submission_id = n.submission_id
                LEFT JOIN levels l ON l.level_id = s.level_id
                WHERE n.user_id = ?
                ORDER BY n.created_at DESC
                LIMIT 50 OFFSET ?
            """
            rows_params = (user_id, offset)

        async with db.execute(count_query, count_params) as cursor:
            total = (await cursor.fetchone())[0]
        async with db.execute(rows_query, rows_params) as cursor:
            rows = await cursor.fetchall()

        async with db.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read = 0", (user_id,)
        ) as cursor:
            unread_count = (await cursor.fetchone())[0]

    return {
        "page":           page,
        "per_page":       50,
        "total":          total,
        "total_pages":    -(-total // 50),
        "unread_count":   unread_count,
        "notifications":  [dict(r) for r in rows]
    }


@router.get("/unread-count")
@limiter.limit("60/minute")
async def get_unread_count(request: Request):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND read = 0", (user_id,)
        ) as cursor:
            count = (await cursor.fetchone())[0]
    return {"unread_count": count}


@router.post("/{notif_id}/read")
@limiter.limit("60/minute")
async def mark_read(request: Request, notif_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT user_id FROM notifications WHERE notif_id = ?", (notif_id,)
        ) as cursor:
            row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Notification not found")
        if row["user_id"] != user_id:
            raise HTTPException(status_code=403, detail="Not your notification")
        await db.execute(
            "UPDATE notifications SET read = 1 WHERE notif_id = ?", (notif_id,)
        )
        await db.commit()
    return {"success": True}


@router.post("/read-all")
@limiter.limit("20/minute")
async def mark_all_read(request: Request):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        await db.execute(
            "UPDATE notifications SET read = 1 WHERE user_id = ?", (user_id,)
        )
        await db.commit()
    return {"success": True}