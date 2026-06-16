import aiosqlite
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, field_validator
from database.db import DB
from util.limiter import limiter
from routers.auth import get_session_user

router = APIRouter(prefix="/groups", tags=["groups"])

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

DISCORD_LINK_PREFIXES = (
    "https://discord.gg/",
    "https://discord.com/invite/",
    "https://www.discord.com/invite/",
)


def validate_video_url(v: str | None) -> str | None:
    if v is None:
        return None
    if not any(v.startswith(p) for p in VIDEO_LINK_PREFIXES):
        raise ValueError("Video link must be from a supported platform (YouTube, TikTok, Twitch, etc.)")
    return v


def validate_discord_url(v: str | None) -> str | None:
    if v is None:
        return None
    if not any(v.startswith(p) for p in DISCORD_LINK_PREFIXES):
        raise ValueError("Discord link must start with https://discord.gg/ or https://discord.com/invite/")
    return v


def calculate_points(position: int, total: int) -> int:
    if total <= 1:
        return 500
    t = (total - position) / (total - 1)
    return round(1 + t * 499)


class CreateGroup(BaseModel):
    name: str
    description: str | None = None
    discord_link: str | None = None
    video_required: bool = False

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Group name must be at least 2 characters")
        if len(v) > 64:
            raise ValueError("Group name must be 64 characters or less")
        return v

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

    @field_validator("discord_link")
    @classmethod
    def validate_discord_link(cls, v):
        return validate_discord_url(v)


class UpdateGroup(BaseModel):
    name: str | None = None
    description: str | None = None
    discord_link: str | None = None
    video_required: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            v = v.strip()
            if len(v) < 2:
                raise ValueError("Group name must be at least 2 characters")
            if len(v) > 64:
                raise ValueError("Group name must be 64 characters or less")
        return v

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

    @field_validator("discord_link")
    @classmethod
    def validate_discord_link(cls, v):
        return validate_discord_url(v)


class AddLevel(BaseModel):
    level_id: int
    position: int

    @field_validator("position")
    @classmethod
    def validate_position(cls, v):
        if v < 1:
            raise ValueError("Position must be at least 1")
        return v


class AddMember(BaseModel):
    user_id: str
    role: str = "member"

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        if v not in ("admin", "member"):
            raise ValueError("Role must be 'admin' or 'member'")
        return v


async def get_group_or_404(db: aiosqlite.Connection, group_id: int) -> aiosqlite.Row:
    async with db.execute("SELECT * FROM groups WHERE group_id = ?", (group_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Group not found")
    return row


async def require_owner(db: aiosqlite.Connection, group_id: int, user_id: str):
    async with db.execute("SELECT owner_id FROM groups WHERE group_id = ?", (group_id,)) as cursor:
        row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Group not found")
    if row["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the group owner can do this")


async def require_admin_or_owner(db: aiosqlite.Connection, group_id: int, user_id: str):
    async with db.execute("SELECT owner_id FROM groups WHERE group_id = ?", (group_id,)) as cursor:
        group = await cursor.fetchone()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group["owner_id"] == user_id:
        return
    async with db.execute(
        "SELECT role FROM group_members WHERE group_id = ? AND user_id = ? AND join_status = 'approved'",
        (group_id, user_id)
    ) as cursor:
        member = await cursor.fetchone()
    if not member or member["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin or owner required")


async def require_approved_member(db: aiosqlite.Connection, group_id: int, user_id: str):
    async with db.execute("SELECT owner_id FROM groups WHERE group_id = ?", (group_id,)) as cursor:
        group = await cursor.fetchone()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    if group["owner_id"] == user_id:
        return
    async with db.execute(
        "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND join_status = 'approved'",
        (group_id, user_id)
    ) as cursor:
        if not await cursor.fetchone():
            raise HTTPException(status_code=403, detail="You are not an approved member of this group")


async def recalculate_points(db: aiosqlite.Connection, group_id: int):
    async with db.execute(
        "SELECT level_id, position FROM group_list WHERE group_id = ? ORDER BY position",
        (group_id,)
    ) as cursor:
        levels = await cursor.fetchall()
    total = len(levels)
    for level in levels:
        points = calculate_points(level["position"], total)
        await db.execute(
            "UPDATE group_list SET points = ? WHERE group_id = ? AND level_id = ?",
            (points, group_id, level["level_id"])
        )


@router.get("/")
@limiter.limit("60/minute")
async def get_all_groups(request: Request, page: int = 1):
    if page < 1:
        raise HTTPException(status_code=400, detail="Page must be 1 or greater")
    offset = (page - 1) * 50
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT COUNT(*) FROM groups") as cursor:
            total = (await cursor.fetchone())[0]
        async with db.execute(
            "SELECT group_id, name, owner_id, description, discord_link, video_required FROM groups LIMIT 50 OFFSET ?",
            (offset,)
        ) as cursor:
            rows = await cursor.fetchall()
    return {
        "page":        page,
        "per_page":    50,
        "total":       total,
        "total_pages": -(-total // 50),
        "groups":      [dict(row) for row in rows]
    }


@router.get("/search")
@limiter.limit("30/minute")
async def search_groups(request: Request, q: str):
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="Query too short")
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT group_id, name, owner_id, description FROM groups WHERE name LIKE ? LIMIT 20",
            (f"%{q}%",)
        ) as cursor:
            rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.get("/me")
@limiter.limit("60/minute")
async def get_my_groups(request: Request):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("""
            SELECT g.group_id, g.name, g.owner_id, g.description, g.discord_link, g.video_required,
                   CASE WHEN g.owner_id = ? THEN 'owner' ELSE gm.role END as my_role,
                   gm.join_status
            FROM groups g
            LEFT JOIN group_members gm ON g.group_id = gm.group_id AND gm.user_id = ?
            WHERE g.owner_id = ? OR gm.user_id = ?
        """, (user_id, user_id, user_id, user_id)) as cursor:
            rows = await cursor.fetchall()
    return [dict(row) for row in rows]


@router.get("/{group_id}")
@limiter.limit("60/minute")
async def get_group(request: Request, group_id: int):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        group = await get_group_or_404(db, group_id)
        async with db.execute("""
            SELECT u.discord_id, u.username, u.avatar_url, gm.role, gm.join_status, gm.joined_at
            FROM group_members gm
            JOIN users u ON u.discord_id = gm.user_id
            WHERE gm.group_id = ?
            ORDER BY gm.joined_at
        """, (group_id,)) as cursor:
            members = await cursor.fetchall()
    return {
        **dict(group),
        "members": [dict(m) for m in members]
    }


@router.post("/")
@limiter.limit("10/minute")
async def create_group(request: Request, body: CreateGroup):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT COUNT(*) FROM groups WHERE owner_id = ?", (user_id,)
        ) as cursor:
            count = (await cursor.fetchone())[0]
        if count >= 10:
            raise HTTPException(status_code=400, detail="You can only own up to 10 groups")
        cursor = await db.execute(
            "INSERT INTO groups (name, owner_id, description, discord_link, video_required) VALUES (?, ?, ?, ?, ?)",
            (body.name, user_id, body.description, body.discord_link, int(body.video_required))
        )
        await db.commit()
    return {"success": True, "group_id": cursor.lastrowid}


@router.patch("/{group_id}")
@limiter.limit("10/minute")
async def update_group(request: Request, group_id: int, body: UpdateGroup):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_owner(db, group_id, user_id)
        group = await get_group_or_404(db, group_id)
        name = body.name if body.name is not None else group["name"]
        description = body.description if body.description is not None else group["description"]
        discord_link = body.discord_link if body.discord_link is not None else group["discord_link"]
        video_required = int(body.video_required) if body.video_required is not None else group["video_required"]
        await db.execute(
            "UPDATE groups SET name = ?, description = ?, discord_link = ?, video_required = ? WHERE group_id = ?",
            (name, description, discord_link, video_required, group_id)
        )
        await db.commit()
    return {"success": True}


@router.delete("/{group_id}")
@limiter.limit("10/minute")
async def delete_group(request: Request, group_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_owner(db, group_id, user_id)
        await db.execute("DELETE FROM notifications WHERE group_id = ?", (group_id,))
        await db.execute("DELETE FROM submissions WHERE group_id = ?", (group_id,))
        await db.execute("DELETE FROM group_list WHERE group_id = ?", (group_id,))
        await db.execute("DELETE FROM group_members WHERE group_id = ?", (group_id,))
        await db.execute("DELETE FROM groups WHERE group_id = ?", (group_id,))
        await db.commit()
    return {"success": True}


@router.post("/{group_id}/join")
@limiter.limit("20/minute")
async def request_join(request: Request, group_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        group = await get_group_or_404(db, group_id)

        if group["owner_id"] == user_id:
            raise HTTPException(status_code=400, detail="You are the owner of this group")

        async with db.execute(
            "SELECT COUNT(*) FROM group_members WHERE user_id = ? AND join_status = 'approved'", (user_id,)
        ) as cursor:
            joined_count = (await cursor.fetchone())[0]
        if joined_count >= 50:
            raise HTTPException(status_code=400, detail="You can only be in up to 50 groups")

        async with db.execute(
            "SELECT join_status FROM group_members WHERE group_id = ? AND user_id = ?",
            (group_id, user_id)
        ) as cursor:
            existing = await cursor.fetchone()
        if existing:
            if existing["join_status"] == "pending":
                raise HTTPException(status_code=409, detail="Join request already pending")
            raise HTTPException(status_code=409, detail="Already a member of this group")

        await db.execute(
            "INSERT INTO group_members (group_id, user_id, role, join_status) VALUES (?, ?, 'member', 'pending')",
            (group_id, user_id)
        )

        async with db.execute(
            "SELECT discord_id FROM users WHERE discord_id = ?", (group["owner_id"],)
        ) as cursor:
            owner = await cursor.fetchone()

        if owner:
            await db.execute(
                "INSERT INTO notifications (user_id, type, group_id) VALUES (?, 'join_request', ?)",
                (group["owner_id"], group_id)
            )

        async with db.execute(
            "SELECT user_id FROM group_members WHERE group_id = ? AND role = 'admin' AND join_status = 'approved'",
            (group_id,)
        ) as cursor:
            admins = await cursor.fetchall()
        for admin in admins:
            await db.execute(
                "INSERT INTO notifications (user_id, type, group_id) VALUES (?, 'join_request', ?)",
                (admin["user_id"], group_id)
            )

        await db.commit()
    return {"success": True}


@router.post("/{group_id}/join/{target_user_id}/approve")
@limiter.limit("30/minute")
async def approve_join(request: Request, group_id: int, target_user_id: str):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_admin_or_owner(db, group_id, user_id)

        async with db.execute(
            "SELECT join_status FROM group_members WHERE group_id = ? AND user_id = ?",
            (group_id, target_user_id)
        ) as cursor:
            member = await cursor.fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="Join request not found")
        if member["join_status"] == "approved":
            raise HTTPException(status_code=409, detail="User is already approved")

        await db.execute(
            "UPDATE group_members SET join_status = 'approved' WHERE group_id = ? AND user_id = ?",
            (group_id, target_user_id)
        )
        await db.execute(
            "INSERT INTO notifications (user_id, type, group_id) VALUES (?, 'join_approved', ?)",
            (target_user_id, group_id)
        )
        await db.commit()
    return {"success": True}


@router.post("/{group_id}/join/{target_user_id}/deny")
@limiter.limit("30/minute")
async def deny_join(request: Request, group_id: int, target_user_id: str):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_admin_or_owner(db, group_id, user_id)

        async with db.execute(
            "SELECT join_status FROM group_members WHERE group_id = ? AND user_id = ?",
            (group_id, target_user_id)
        ) as cursor:
            member = await cursor.fetchone()
        if not member:
            raise HTTPException(status_code=404, detail="Join request not found")
        if member["join_status"] == "approved":
            raise HTTPException(status_code=400, detail="Cannot deny an already approved member")

        await db.execute(
            "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
            (group_id, target_user_id)
        )
        await db.execute(
            "INSERT INTO notifications (user_id, type, group_id) VALUES (?, 'join_denied', ?)",
            (target_user_id, group_id)
        )
        await db.commit()
    return {"success": True}


@router.delete("/{group_id}/members/{target_user_id}")
@limiter.limit("30/minute")
async def remove_member(request: Request, group_id: int, target_user_id: str):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        if user_id != target_user_id:
            await require_admin_or_owner(db, group_id, user_id)

        async with db.execute(
            "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?",
            (group_id, target_user_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Member not found")

        await db.execute(
            "DELETE FROM submissions WHERE group_id = ? AND user_id = ? AND status = 'accepted'",
            (group_id, target_user_id)
        )
        await db.execute(
            "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
            (group_id, target_user_id)
        )
        await db.commit()
    return {"success": True}


@router.patch("/{group_id}/members/{target_user_id}/role")
@limiter.limit("20/minute")
async def update_member_role(request: Request, group_id: int, target_user_id: str, body: AddMember):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_owner(db, group_id, user_id)

        async with db.execute(
            "SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ? AND join_status = 'approved'",
            (group_id, target_user_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Approved member not found")

        await db.execute(
            "UPDATE group_members SET role = ? WHERE group_id = ? AND user_id = ?",
            (body.role, group_id, target_user_id)
        )
        await db.commit()
    return {"success": True}


@router.get("/{group_id}/join-requests")
@limiter.limit("30/minute")
async def get_join_requests(request: Request, group_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_admin_or_owner(db, group_id, user_id)
        async with db.execute("""
            SELECT gm.user_id, gm.joined_at, u.username, u.avatar_url
            FROM group_members gm
            JOIN users u ON u.discord_id = gm.user_id
            WHERE gm.group_id = ? AND gm.join_status = 'pending'
            ORDER BY gm.joined_at
        """, (group_id,)) as cursor:
            rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/{group_id}/levels")
@limiter.limit("60/minute")
async def get_group_levels(request: Request, group_id: int):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await get_group_or_404(db, group_id)
        async with db.execute(
            "SELECT COUNT(*) FROM group_list WHERE group_id = ?", (group_id,)
        ) as cursor:
            total = (await cursor.fetchone())[0]
        async with db.execute("""
            SELECT gl.level_id, gl.position, gl.points,
                   l.name, l.position as aredl_position, l.link, l.description
            FROM group_list gl
            JOIN levels l ON l.level_id = gl.level_id
            WHERE gl.group_id = ?
            ORDER BY gl.position
        """, (group_id,)) as cursor:
            levels = await cursor.fetchall()

        result = []
        for level in levels:
            async with db.execute("""
                SELECT s.user_id, s.record, s.video_link, s.submitted_at,
                       u.username, u.avatar_url
                FROM submissions s
                JOIN users u ON u.discord_id = s.user_id
                WHERE s.group_id = ? AND s.level_id = ? AND s.status = 'accepted'
                ORDER BY s.submitted_at
            """, (group_id, level["level_id"])) as cursor:
                completions = await cursor.fetchall()
            row = dict(level)
            row["completions"] = [dict(c) for c in completions]
            result.append(row)

    return result


@router.post("/{group_id}/levels")
@limiter.limit("20/minute")
async def add_group_level(request: Request, group_id: int, body: AddLevel):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_admin_or_owner(db, group_id, user_id)

        async with db.execute(
            "SELECT 1 FROM levels WHERE level_id = ?", (body.level_id,)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Level not found")

        async with db.execute(
            "SELECT 1 FROM group_list WHERE group_id = ? AND level_id = ?",
            (group_id, body.level_id)
        ) as cursor:
            if await cursor.fetchone():
                raise HTTPException(status_code=409, detail="Level already in group list")

        async with db.execute(
            "SELECT 1 FROM group_list WHERE group_id = ? AND position = ?",
            (group_id, body.position)
        ) as cursor:
            if await cursor.fetchone():
                await db.execute(
                    "UPDATE group_list SET position = position + 1 WHERE group_id = ? AND position >= ?",
                    (group_id, body.position)
                )

        await db.execute(
            "INSERT INTO group_list (group_id, level_id, position, points) VALUES (?, ?, ?, 0)",
            (group_id, body.level_id, body.position)
        )
        await recalculate_points(db, group_id)
        await db.commit()
    return {"success": True}


@router.delete("/{group_id}/levels/{level_id}")
@limiter.limit("20/minute")
async def remove_group_level(request: Request, group_id: int, level_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_admin_or_owner(db, group_id, user_id)

        async with db.execute(
            "SELECT 1 FROM group_list WHERE group_id = ? AND level_id = ?",
            (group_id, level_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Level not in group list")

        await db.execute(
            "DELETE FROM group_list WHERE group_id = ? AND level_id = ?",
            (group_id, level_id)
        )
        await recalculate_points(db, group_id)
        await db.commit()
    return {"success": True}


@router.patch("/{group_id}/levels/{level_id}/position")
@limiter.limit("20/minute")
async def update_level_position(request: Request, group_id: int, level_id: int, body: AddLevel):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await require_admin_or_owner(db, group_id, user_id)

        async with db.execute(
            "SELECT 1 FROM group_list WHERE group_id = ? AND level_id = ?",
            (group_id, level_id)
        ) as cursor:
            if not await cursor.fetchone():
                raise HTTPException(status_code=404, detail="Level not in group list")

        await db.execute(
            "UPDATE group_list SET position = ? WHERE group_id = ? AND level_id = ?",
            (body.position, group_id, level_id)
        )
        await recalculate_points(db, group_id)
        await db.commit()
    return {"success": True}


@router.get("/{group_id}/leaderboard")
@limiter.limit("60/minute")
async def get_leaderboard(request: Request, group_id: int):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        await get_group_or_404(db, group_id)
        async with db.execute("""
            SELECT s.user_id, u.username, u.avatar_url,
                   COALESCE(SUM(gl.points), 0) as total_points,
                   COUNT(s.submission_id) as completions
            FROM submissions s
            JOIN users u ON u.discord_id = s.user_id
            JOIN group_list gl ON gl.group_id = s.group_id AND gl.level_id = s.level_id
            WHERE s.group_id = ? AND s.status = 'accepted' AND s.record = 100
            GROUP BY s.user_id
            ORDER BY total_points DESC
        """, (group_id,)) as cursor:
            rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/{group_id}/sync")
@limiter.limit("10/minute")
async def sync_personal_list(request: Request, group_id: int):
    user_id = get_session_user(request)
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        group = await get_group_or_404(db, group_id)
        await require_approved_member(db, group_id, user_id)

        async with db.execute(
            "SELECT level_id, video_link, record FROM user_list WHERE user_id = ?", (user_id,)
        ) as cursor:
            personal_levels = await cursor.fetchall()

        async with db.execute(
            "SELECT level_id FROM group_list WHERE group_id = ?", (group_id,)
        ) as cursor:
            group_level_ids = {row["level_id"] for row in await cursor.fetchall()}

        video_required = bool(group["video_required"])
        queued = 0

        for entry in personal_levels:
            if entry["level_id"] not in group_level_ids:
                continue

            if video_required and not entry["video_link"]:
                continue

            async with db.execute("""
                SELECT submission_id, record, status FROM submissions
                WHERE group_id = ? AND level_id = ? AND user_id = ?
                ORDER BY submitted_at DESC LIMIT 1
            """, (group_id, entry["level_id"], user_id)) as cursor:
                existing = await cursor.fetchone()

            if existing:
                if existing["status"] == "pending":
                    continue
                if existing["status"] == "accepted" and existing["record"] >= entry["record"]:
                    continue

            await db.execute("""
                INSERT INTO submissions (group_id, level_id, user_id, record, video_link)
                VALUES (?, ?, ?, ?, ?)
            """, (group_id, entry["level_id"], user_id, entry["record"], entry["video_link"]))
            queued += 1

        await db.commit()
    return {"success": True, "queued": queued}