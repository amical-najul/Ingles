
import asyncio
from sqlalchemy import text
from app.database import async_session

async def inspect_schema():
    async with async_session() as session:
        print("--- LESSONS Table Constraints ---")
        result = await session.execute(text("""
            SELECT conname, pg_get_constraintdef(c.oid)
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE conrelid = 'lessons'::regclass
        """))
        for row in result.fetchall():
            print(row)
            
        print("\n--- LEVELS Table Columns ---")
        result = await session.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'levels'
        """))
        for row in result.fetchall():
            print(row)

if __name__ == "__main__":
    asyncio.run(inspect_schema())
