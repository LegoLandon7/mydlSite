import requests
import aiosqlite
from database.db import DB, init_db

API = "https://api.aredl.net/v2/api/aredl/levels"

def get_level_data():
    try:
        response = requests.get(API, timeout=60)
        response.raise_for_status()
        return response.json()
    except requests.RequestException as e:
        print(f"[ERROR] {e}")
        return None

async def populate_database():
    await init_db()

    list_data = get_level_data()
    if not list_data:
        print("[ERROR] No data fetched from API.")
        return

    async with aiosqlite.connect(DB) as db:
        for entry in list_data:
            await db.execute(
                """
                INSERT OR REPLACE INTO levels
                (level_id, name, position, aredl_url, thumbnail_url, description)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    entry.get("level_id"),
                    entry.get("name"),
                    entry.get("position"),
                    f"https://aredl.net/list/{entry.get('level_id')}",
                    f"https://raw.githubusercontent.com/All-Rated-Extreme-Demon-List/Thumbnails/main/levels/full/{entry.get('level_id')}.webp",
                    entry.get("description"),
                ),
            )

        await db.commit()

    print(f"Successfully synced {len(list_data)} levels to the database.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(populate_database())