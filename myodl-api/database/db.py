import aiosqlite

DB = "app.db"

async def init_db():
    with open("schema.sql") as f:
        schema = f.read()
    async with aiosqlite.connect(DB) as db:
        await db.executescript(schema)
        await db.commit()