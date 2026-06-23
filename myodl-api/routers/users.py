import aiosqlite
from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel

from database.db import DB
from util.limiter import limiter

from routers.levels import Level

router = APIRouter(prefix="/users", tags=["users"])

# classes

class User(BaseModel):
    discord_id: str
    username: str
    avatar_url: str | None = None
    description: str | None = None

class UserResponse(BaseModel):
    total: int
    limit: int
    offset: int
    users: list[User]

class UserLevels(BaseModel):
    user: User
    levels: list[Level]

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