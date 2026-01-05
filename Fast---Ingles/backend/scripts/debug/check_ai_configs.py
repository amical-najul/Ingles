#!/usr/bin/env python3
"""Check AI configs using raw SQL."""
import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def check_configs():
    # Build URL from env vars
    user = os.getenv("POSTGRES_USER", "postgres")
    password = os.getenv("POSTGRES_PASSWORD", "postgres")
    host = os.getenv("POSTGRES_HOST", "db")
    port = os.getenv("POSTGRES_PORT", "5432")
    db = os.getenv("POSTGRES_DB", "fastingles")
    
    url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"
    engine = create_async_engine(url)
    
    async with engine.connect() as conn:
        # Check if table exists
        result = await conn.execute(text(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_configs')"
        ))
        exists = result.scalar()
        
        if not exists:
            print("ERROR: ai_configs table does not exist!")
            print("You need to run the migration to create this table.")
            return
        
        # Get configs
        result = await conn.execute(text("SELECT provider, model, api_key, is_active FROM ai_configs"))
        rows = result.fetchall()
        
        if not rows:
            print("WARNING: ai_configs table is EMPTY!")
            print("You need to seed AI provider configurations.")
            return
        
        print(f"Found {len(rows)} AI configurations:")
        for row in rows:
            provider, model, api_key, is_active = row
            key_status = "SET" if api_key and len(api_key) > 5 else "EMPTY"
            print(f"  - {provider}: model={model}, active={is_active}, key={key_status}")

if __name__ == "__main__":
    asyncio.run(check_configs())
