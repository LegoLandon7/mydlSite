import aiosqlite
from fastapi import APIRouter, Depends, Query, Request, HTTPException
from pydantic import BaseModel

from database.db import DB
from util.limiter import limiter

from core.auth import get_current_user

router = APIRouter(prefix="/lists", tags=["lists"])

from routers.levels import Level
from routers.users import User

# classes

from models import *

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

@router.get("/{list_id}/{level_id}/records", response_model=ListRecords)
@limiter.limit("30/minute")
async def get_level_records(request: Request, list_id: int, level_id: int):

    async with aiosqlite.connect(DB) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT 1 FROM lists WHERE list_id = ?", (list_id,)
        ) as c:
            list_exists = await c.fetchone()

        if not list_exists:
            raise HTTPException(404, "List not found")

        async with db.execute(
            "SELECT 1 FROM levels WHERE level_id = ?", (level_id,)
        ) as c:
            level_exists = await c.fetchone()

        if not level_exists:
            raise HTTPException(404, "Level not found")

        async with db.execute(
            "SELECT u.discord_id AS user_discord_id, u.username AS user_username, u.avatar_url AS user_avatar_url, u.description AS user_description, le.level_id, le.name AS level_name, le.position AS level_position, le.aredl_url, le.thumbnail_url, le.description AS level_description, li.list_id, li.owner_discord_id, li.name AS list_name, li.description AS list_description, li.community_url, li.icon_url, li.public, lr.record FROM list_records lr JOIN users u ON u.discord_id = lr.discord_id JOIN levels le ON le.level_id = lr.level_id JOIN lists li ON li.list_id = lr.list_id WHERE lr.list_id = ? AND lr.level_id = ? ORDER BY lr.record DESC;", (list_id, level_id),
        ) as c:
            rows = await c.fetchall()

    if not rows:
        return ListRecords(list=None,user=None,records=[])

    return ListRecords(
        list=List(
            list_id=rows[0]["list_id"],
            owner_discord_id=rows[0]["owner_discord_id"],
            name=rows[0]["list_name"],
            description=rows[0]["list_description"],
            community_url=rows[0]["community_url"],
            icon_url=rows[0]["icon_url"],
            public=bool(rows[0]["public"]),
        ),
        user=User(
            discord_id=rows[0]["user_discord_id"],
            username=rows[0]["user_username"],
            avatar_url=rows[0]["user_avatar_url"],
            description=rows[0]["user_description"],
        ),
        records=[
            ListRecord(
                level=Level(
                    level_id=row["level_id"],
                    name=row["level_name"],
                    position=row["level_position"],
                    aredl_url=row["aredl_url"],
                    thumbnail_url=row["thumbnail_url"],
                    description=row["level_description"],
                ),
                record=row["record"],
            )
            for row in rows
        ]
    )