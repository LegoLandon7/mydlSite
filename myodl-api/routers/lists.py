import aiosqlite
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from pydantic import BaseModel

from database.db import DB
from util.limiter import limiter

from routers.auth import get_current_user

router = APIRouter(prefix="/lists", tags=["lists"])

from routers.levels import Level
from routers.users import User

# classes

class List(BaseModel):
    list_id: int
    owner_discord_id: str
    name: str
    description: str | None = None
    community_url: str | None = None
    icon_link: str | None = None

class ListResponse(BaseModel):
    total: int
    limit: int
    offset: int
    lists: list[List]

class ListLevels(BaseModel):
    list: List
    levels: list[Level]

class ListMember(BaseModel):
    user: User
    role: str
    joined_at: str

# helpers

async def require_list_owner(list_id: str, current_user: User = Depends(get_current_user)) -> User:
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT owner_discord_id FROM lists WHERE list_id = ?", (list_id,)) as c:
            list_row = await c.fetchone()

    if not list_row:
        raise HTTPException(404, "List not found")

    if str(list_row["owner_discord_id"]) != str(current_user.discord_id):
        raise HTTPException(403, "Only the list owner can do this")

    return current_user

# routers

@router.get("/", response_model = ListResponse)
@limiter.limit("30/minute")
async def list_lists(request: Request, 
    limit: int = Query(50, ge=1, le=100), 
    offset: int = Query(0, ge=0),
    search: str | None = None
):
    search_value = f"%{search.lower()}%" if search else None

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # get lists
        if (search):
            query = "SELECT * FROM lists WHERE lower(name) LIKE ? OR list_id LIKE ? ORDER BY name LIMIT ? OFFSET ?"
            parameters = (search_value, search_value, limit, offset)
        else:
            query = "SELECT * FROM lists ORDER BY name LIMIT ? OFFSET ?"
            parameters = (limit, offset) 

        async with db.execute(query, parameters) as c:
            rows = await c.fetchall()

        lists = [List.model_validate(dict(r)) for r in rows]

        # get count
        if (search):
            count_query = "SELECT COUNT(*) as count FROM lists WHERE lower(name) LIKE ? OR list_id = ?"
            count_parameters = (search_value, search_value)
        else:
            count_query = "SELECT COUNT(*) as count FROM lists"
            count_parameters = ()

        async with db.execute(count_query, count_parameters) as c:
            total = (await c.fetchone())["count"]

    return ListResponse(total=total, limit=limit, offset=offset, lists=lists)

@router.get("/{list_id}", response_model = List)
@limiter.limit("60/minute")
async def get_list(request: Request, list_id: int):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("SELECT * FROM lists WHERE list_id = ?", (list_id,),) as c:
            list = await c.fetchone()

    if not list:
        raise HTTPException(404, "List not found")
    
    list_obj = List.model_validate(dict(list))
    return list_obj

@router.get("/{list_id}/levels", response_model = ListLevels)
@limiter.limit("30/minute")
async def get_list_levels(request: Request, list_id: int):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        # get levels
        async with db.execute("SELECT l.* FROM list_levels u JOIN levels l ON u.level_id = l.level_id WHERE u.list_id = ? ORDER BY l.position", (list_id,),) as c:
            levels = await c.fetchall()
        
        # get list
        async with db.execute("SELECT * FROM lists WHERE list_id = ?", (list_id,),) as c:
            list = await c.fetchone()

    if not list:
        raise HTTPException(404, "List not found")

    list_obj = List.model_validate(dict(list))
    levels_obj = [Level.model_validate(dict(r)) for r in levels]
    return ListLevels(list=list_obj, levels=levels_obj)

@router.get("/{list_id}/members", response_model=list[ListMember])
@limiter.limit("30/minute")
async def list_members(request: Request, list_id: int):
    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT u.*, lm.role, lm.joined_at FROM list_members lm JOIN users u ON u.discord_id = lm.discord_id WHERE lm.list_id = ? ORDER BY lm.joined_at", (list_id,),) as c:
            members = await c.fetchall()
        
    members_obj = [ListMember(user=User.model_validate({k: r[k] for k in r.keys() if k in User.model_fields}),
            role=r["role"], joined_at=r["joined_at"],) for r in members]
    return members_obj
