import aiosqlite
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel

from database.db import DB
from util.limiter import limiter

router = APIRouter(prefix="/users", tags=["users"])

# classes

from models import *

# routers

@router.get("/", response_model = UserResponse)
@limiter.limit("30/minute")
async def list_users(request: Request, 
    limit: int = Query(50, ge=1, le=100), 
    offset: int = Query(0, ge=0),
    search: str | None = None
):
    search_value = f"%{search.lower()}%" if search else None

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # get users
        if (search):
            query = "SELECT * FROM users WHERE lower(username) LIKE ? OR discord_id LIKE ? ORDER BY username LIMIT ? OFFSET ?"
            parameters = (search_value, search_value, limit, offset)
        else:
            query = "SELECT * FROM users ORDER BY username LIMIT ? OFFSET ?"
            parameters = (limit, offset) 

        async with db.execute(query, parameters) as c:
            rows = await c.fetchall()

        users = [User.model_validate(dict(r)) for r in rows]

        # get count
        if (search):
            count_query = "SELECT COUNT(*) as count FROM users WHERE lower(username) LIKE ? OR discord_id = ?"
            count_parameters = (search_value, search_value)
        else:
            count_query = "SELECT COUNT(*) as count FROM users"
            count_parameters = ()

        async with db.execute(count_query, count_parameters) as c:
            total = (await c.fetchone())["count"]

    return UserResponse(total=total, limit=limit, offset=offset, users=users)

@router.get("/{discord_id}", response_model = User)
@limiter.limit("60/minute")
async def get_user(request: Request, discord_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("SELECT * FROM users WHERE discord_id = ?", (discord_id,),) as c:
            user = await c.fetchone()

    if not user:
        raise HTTPException(404, "User not found")
    
    user_obj = User.model_validate(dict(user))
    return user_obj

@router.get("/{discord_id}/levels", response_model = UserLevels)
@limiter.limit("30/minute")
async def get_user_levels(request: Request, discord_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # get levels
        async with db.execute("SELECT l.* FROM user_levels u JOIN levels l ON u.level_id = l.level_id WHERE u.discord_id = ? ORDER BY l.position", (discord_id,),) as c:
            levels = await c.fetchall()
        
        # get user
        async with db.execute("SELECT * FROM users WHERE discord_id = ?", (discord_id,),) as c:
            user = await c.fetchone()

    if not user:
        raise HTTPException(404, "User not found")

    user_obj = User.model_validate(dict(user))
    levels_obj = [Level.model_validate(dict(r)) for r in levels]
    return UserLevels(user=user_obj, levels=levels_obj)

@router.get("/{discord_id}/records", response_model=UserRecords)
@limiter.limit("30/minute")
async def get_user_records(request: Request, discord_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT * FROM users WHERE discord_id = ?", (discord_id,),
        ) as c:
            user = await c.fetchone()

        if not user:
            raise HTTPException(404, "User not found")

        async with db.execute(
            "SELECT lr.record, l.* FROM user_records lr JOIN levels l ON l.level_id = lr.level_id WHERE lr.discord_id = ? ORDER BY l.position", (discord_id,),
        ) as c:
            rows = await c.fetchall()

    user_obj = User.model_validate(dict(user))

    records = [UserRecord(level=Level.model_validate(dict(row)), record=row["record"]) for row in rows]
    return UserRecords(user=user_obj, records=records)

@router.get("/{discord_id}/lists", response_model=UserLists)
@limiter.limit("30/minute")
async def get_user_lists(request: Request, discord_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # get user
        async with db.execute(
            "SELECT * FROM users WHERE discord_id = ?",
            (discord_id,)
        ) as c:
            user = await c.fetchone()

        if not user:
            raise HTTPException(404, "User not found")

        # get lists
        async with db.execute("SELECT * FROM lists WHERE owner_discord_id = ? ORDER BY name",(discord_id,),) as c:
            lists = await c.fetchall()

    user_obj = User.model_validate(dict(user))
    lists_obj = [List.model_validate(dict(r)) for r in lists]

    return UserLists(user=user_obj, lists=lists_obj)

@router.get("/admins", response_model=UserAdmins)
@limiter.limit("20/minute")
async def get_admins(request: Request):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT u.*, o.owner FROM site_admins o JOIN users u ON o.discord_id = u.discord_id ORDER BY u.username",) as c:
            rows = await c.fetchall()

        if not rows:
            raise HTTPException(404, "No users found")

    admins = [UserAdmin(
        user=User(
            discord_id=row["discord_id"],
            username=row["username"],
            avatar_url=row["avatar_url"],
            description=row["description"]),
        admin=True, owner=row["owner"]) for row in rows]
    
    return UserAdmins(count=len(admins), admins=admins)

@router.get("/admins/{discord_id}", response_model=UserAdmin)
@limiter.limit("20/minute")
async def get_user_admin(request: Request, discord_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT * FROM users WHERE discord_id = ?", (discord_id,),) as c:
            user = await c.fetchone()

        if not user:
            raise HTTPException(404, "User not found")

        async with db.execute(
            "SELECT * FROM site_admins WHERE discord_id = ?", (discord_id,),) as c:
            admin = await c.fetchone()

    user_obj = User.model_validate(dict(user))
    return UserAdmin(user=user_obj, admin=admin is not None,owner=admin["owner"] if admin else False)

@router.get("/{discord_id}/details", response_model=UserDetails)
@limiter.limit("60/minute")
async def get_user_details(request: Request, discord_id: str):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # user
        async with db.execute("SELECT * FROM users WHERE discord_id = ?",(discord_id,),) as c:
            user = await c.fetchone()
        if not user:
            raise HTTPException(404, "user not found")

        # levels
        async with db.execute("SELECT l.* FROM user_levels u JOIN levels l ON u.level_id = l.level_id WHERE u.discord_id = ? ORDER BY l.position", (discord_id,),) as c:
            levels = await c.fetchall()
        
        # records
        async with db.execute("SELECT lr.record AS record, l.* FROM user_records lr JOIN levels l ON l.level_id = lr.level_id WHERE lr.discord_id = ? ORDER BY l.position", (discord_id,),) as c:
            records = await c.fetchall()

        # lists
        async with db.execute("SELECT * FROM lists WHERE owner_discord_id = ? ORDER BY name",(discord_id,),) as c:
            lists = await c.fetchall()

        # admin
        async with db.execute("SELECT * FROM site_admins WHERE discord_id = ?", (discord_id,),) as c:
            admin = await c.fetchone()

    user_obj = User.model_validate(dict(user))
    levels_obj = [Level.model_validate(dict(r)) for r in levels]
    records_obj = [UserRecord(level=Level.model_validate(dict(r)),record=r["record"])for r in records]
    lists_obj = [List.model_validate(dict(r)) for r in lists]

    return UserDetails(user=user_obj, levels=levels_obj, records=records_obj, lists=lists_obj, admin=admin is not None, owner=admin["owner"] if admin else False)

@router.patch("/{discord_id}/description")
@limiter.limit("10/minute")
async def update_description(request: Request, discord_id: str, body: UpdateDescription):
    session = request.session.get("discord_id")
    if not session:
        raise HTTPException(401, "Not logged in")

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("SELECT * FROM site_admins WHERE discord_id = ?", (session,)) as c:
            admin = await c.fetchone()

        if session != discord_id and not admin:
            raise HTTPException(403, "Forbidden")

        async with db.execute("SELECT * FROM users WHERE discord_id = ?", (discord_id,)) as c:
            user = await c.fetchone()

        if not user:
            raise HTTPException(404, "User not found")

        await db.execute("UPDATE users SET description = ? WHERE discord_id = ?", (body.description, discord_id))
        await db.commit()

    return { "ok": True }