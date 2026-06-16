import aiosqlite
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator
from database.db import DB
from util.limiter import limiter
from routers.auth import get_session_user
from routers.groups import (
    VIDEO_LINK_PREFIXES,
    validate_video_url,
    get_group_or_404,
    require_admin_or_owner,
    require_approved_member,
    recalculate_points,
)

router = APIRouter(prefix="/submissions", tags=["submissions"])


class CreateSubmission(BaseModel):
    group_id: int
    level_id: int
    record: int = 100
    video_link: str | None = None

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


@router.post("/")
@limiter.limit("20/minute")
async def create_submission(request: Request, body: CreateSubmission):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        group = await get_group_or_404(db, body.group_id)
        await require_approved_member(db, body.group_id, user_id)

        async with db.execute(
            "SELECT 1 FROM group_list WHERE group_id = ? AND level_id = ?",
            (body.group_id, body.level_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Level not in this group's list")

        if group["video_required"] and not body.video_link:
            raise HTTPException(status_code=400, detail="This group requires a video link")

        async with db.execute("""
            SELECT submission_id, record, status FROM submissions
            WHERE group_id = ? AND level_id = ? AND user_id = ?
            ORDER BY submitted_at DESC LIMIT 1
        """, (body.group_id, body.level_id, user_id)) as cursor:
            existing = await cursor.fetchone()

        if existing:
            if existing["status"] == "pending":
                raise HTTPException(status_code=409, detail="You already have a pending submission for this level")
            if existing["status"] == "accepted" and existing["record"] >= body.record:
                raise HTTPException(status_code=409, detail="Submitted record is not higher than your accepted record")

        cursor = await db.execute("""
            INSERT INTO submissions (group_id, level_id, user_id, record, video_link)
            VALUES (?, ?, ?, ?, ?)
        """, (body.group_id, body.level_id, user_id, body.record, body.video_link))
        await db.commit()
    return {"success": True, "submission_id": cursor.lastrowid}


@router.get("/group/{group_id}")
@limiter.limit("30/minute")
async def get_group_submissions(request: Request, group_id: int, page: int = 1, status: str | None = None):
    user_id = get_session_user(request)
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be 1 or greater")
    if status and status not in ("pending", "accepted", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be pending, accepted, or rejected")
    offset = (page - 1) * 50
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_admin_or_owner(db, group_id, user_id)

        if status:
            count_query = "SELECT COUNT(*) FROM submissions WHERE group_id = ? AND status = ?"
            count_params = (group_id, status)
            rows_query = """
                SELECT s.submission_id, s.level_id, s.user_id, s.record, s.video_link,
                       s.status, s.submitted_at, s.reviewed_at,
                       u.username, u.avatar_url,
                       l.name as level_name, l.position as level_position
                FROM submissions s
                JOIN users u ON u.discord_id = s.user_id
                JOIN levels l ON l.level_id = s.level_id
                WHERE s.group_id = ? AND s.status = ?
                ORDER BY s.submitted_at
                LIMIT 50 OFFSET ?
            """
            rows_params = (group_id, status, offset)
        else:
            count_query = "SELECT COUNT(*) FROM submissions WHERE group_id = ?"
            count_params = (group_id,)
            rows_query = """
                SELECT s.submission_id, s.level_id, s.user_id, s.record, s.video_link,
                       s.status, s.submitted_at, s.reviewed_at,
                       u.username, u.avatar_url,
                       l.name as level_name, l.position as level_position
                FROM submissions s
                JOIN users u ON u.discord_id = s.user_id
                JOIN levels l ON l.level_id = s.level_id
                WHERE s.group_id = ?
                ORDER BY s.submitted_at
                LIMIT 50 OFFSET ?
            """
            rows_params = (group_id, offset)

        async with db.execute(count_query, count_params) as cursor:
            total = (await cursor.fetchone())[0]
        async with db.execute(rows_query, rows_params) as cursor:
            rows = await cursor.fetchall()

    return {
        "page":        page,
        "per_page":    50,
        "total":       total,
        "total_pages": -(-total // 50),
        "submissions": [dict(r) for r in rows]
    }


@router.get("/me")
@limiter.limit("30/minute")
async def get_my_submissions(request: Request, page: int = 1, group_id: int | None = None):
    user_id = get_session_user(request)
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be 1 or greater")
    offset = (page - 1) * 50
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        if group_id:
            count_query = "SELECT COUNT(*) FROM submissions WHERE user_id = ? AND group_id = ?"
            count_params = (user_id, group_id)
            rows_query = """
                SELECT s.submission_id, s.group_id, s.level_id, s.record, s.video_link,
                       s.status, s.submitted_at, s.reviewed_at,
                       g.name as group_name,
                       l.name as level_name, l.position as level_position
                FROM submissions s
                JOIN groups g ON g.group_id = s.group_id
                JOIN levels l ON l.level_id = s.level_id
                WHERE s.user_id = ? AND s.group_id = ?
                ORDER BY s.submitted_at DESC
                LIMIT 50 OFFSET ?
            """
            rows_params = (user_id, group_id, offset)
        else:
            count_query = "SELECT COUNT(*) FROM submissions WHERE user_id = ?"
            count_params = (user_id,)
            rows_query = """
                SELECT s.submission_id, s.group_id, s.level_id, s.record, s.video_link,
                       s.status, s.submitted_at, s.reviewed_at,
                       g.name as group_name,
                       l.name as level_name, l.position as level_position
                FROM submissions s
                JOIN groups g ON g.group_id = s.group_id
                JOIN levels l ON l.level_id = s.level_id
                WHERE s.user_id = ?
                ORDER BY s.submitted_at DESC
                LIMIT 50 OFFSET ?
            """
            rows_params = (user_id, offset)

        async with db.execute(count_query, count_params) as cursor:
            total = (await cursor.fetchone())[0]
        async with db.execute(rows_query, rows_params) as cursor:
            rows = await cursor.fetchall()

    return {
        "page":        page,
        "per_page":    50,
        "total":       total,
        "total_pages": -(-total // 50),
        "submissions": [dict(r) for r in rows]
    }


@router.get("/me/queue/{group_id}")
@limiter.limit("30/minute")
async def get_queue_position(request: Request, group_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await get_group_or_404(db, group_id)
        async with db.execute("""
            SELECT submission_id, submitted_at FROM submissions
            WHERE group_id = ? AND user_id = ? AND status = 'pending'
            ORDER BY submitted_at
        """, (group_id, user_id)) as cursor:
            my_pending = await cursor.fetchall()

        if not my_pending:
            return {"pending_count": 0, "submissions": []}

        earliest = my_pending[0]["submitted_at"]
        async with db.execute("""
            SELECT COUNT(*) FROM submissions
            WHERE group_id = ? AND status = 'pending' AND submitted_at < ?
        """, (group_id, earliest)) as cursor:
            ahead = (await cursor.fetchone())[0]

    return {
        "pending_count": len(my_pending),
        "submissions_ahead": ahead,
        "submissions": [dict(r) for r in my_pending]
    }


@router.post("/{submission_id}/accept")
@limiter.limit("30/minute")
async def accept_submission(request: Request, submission_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM submissions WHERE submission_id = ?", (submission_id,)
        ) as cursor:
            sub = await cursor.fetchone()
        if not sub:
            raise HTTPException(status_code=404, detail="Submission not found")
        if sub["status"] != "pending":
            raise HTTPException(status_code=400, detail="Submission is not pending")

        await require_admin_or_owner(db, sub["group_id"], user_id)

        await db.execute("""
            UPDATE submissions SET status = 'accepted', reviewed_at = datetime('now')
            WHERE submission_id = ?
        """, (submission_id,))
        await db.execute("""
            INSERT INTO notifications (user_id, type, group_id, submission_id)
            VALUES (?, 'submission_accepted', ?, ?)
        """, (sub["user_id"], sub["group_id"], submission_id))
        await db.commit()
    return {"success": True}


@router.post("/{submission_id}/reject")
@limiter.limit("30/minute")
async def reject_submission(request: Request, submission_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM submissions WHERE submission_id = ?", (submission_id,)
        ) as cursor:
            sub = await cursor.fetchone()
        if not sub:
            raise HTTPException(status_code=404, detail="Submission not found")
        if sub["status"] != "pending":
            raise HTTPException(status_code=400, detail="Submission is not pending")

        await require_admin_or_owner(db, sub["group_id"], user_id)

        await db.execute("""
            UPDATE submissions SET status = 'rejected', reviewed_at = datetime('now')
            WHERE submission_id = ?
        """, (submission_id,))
        await db.execute("""
            INSERT INTO notifications (user_id, type, group_id, submission_id)
            VALUES (?, 'submission_rejected', ?, ?)
        """, (sub["user_id"], sub["group_id"], submission_id))
        await db.commit()
    return {"success": True}