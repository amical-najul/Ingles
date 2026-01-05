
import asyncio
from sqlalchemy import text
from app.database import async_session

async def list_tables():
    async with async_session() as session:
        result = await session.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [row[0] for row in result.fetchall()]
        print("Tables in DB:", tables)

if __name__ == "__main__":
    asyncio.run(list_tables())
