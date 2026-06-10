import requests
import os
import aiosqlite
import asyncio
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from database.db import DB, init_db

API = "https://api.aredl.net/v2/api/aredl/levels"

def get_level_data():
    try:
        response = requests.get(API, timeout=60)

        if response.status_code != 200: 
            print(f"[ERROR] {API} endpoint unreached. Status code: {response.status_code}")
            return None
        
        data = response.json()
        return data
        
    except requests.exceptions.RequestException as e:
        print(f"[ERROR] A network error occurred: {e}")
        return None

async def populate_database():
    await init_db()
    
    list_data = get_level_data()

    if not list_data:
        print("[ERROR] No data fetched from API. Aborting database sync.")
        return
    
    async with aiosqlite.connect(DB) as db:
        for entry in list_data:
            
            await db.execute('''
                INSERT OR REPLACE INTO levels (level_id, name, position, link)
                VALUES (?, ?, ?, ?)
            ''', (
                entry.get("level_id"),
                entry.get("name"),
                entry.get("position"),
                f"https://aredl.net/list/{entry.get('level_id')}"
            ))

            await db.commit()
            print(f"Successfully synced {len(list_data)} levels to the database.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(populate_database())