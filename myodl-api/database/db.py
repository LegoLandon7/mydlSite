import aiosqlite

DB = "data/app.db"

async def init_db():
    with open("database/schema.sql") as f:
        schema = f.read()
    async with aiosqlite.connect(DB) as db:
        await db.executescript(schema)
        await db.commit()