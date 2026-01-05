
import asyncio
from sqlalchemy import create_engine, inspect, text
from app.config import get_settings

settings = get_settings()

# Use the synchronous engine for inspection and simple queries
# If using asyncpg, we need to switch to psycopg2 or similar for sync engine, 
# but usually inside the container 'psycopg2-binary' or 'psycopg2' might not be installed if we only use asyncpg.
# Let's hope sqlalchemy supports what we have or just print connection string to verify.
# Actually, if only asyncpg is installed, create_engine(postgresql://...) will fail if it defaults to psycopg2.
# We might need to use `postgresql+psycopg2://` but that requires the driver.
# If only asyncpg is installed, we can't use sync engine easily without async loop.
# But let's try.

DATABASE_URL = settings.DATABASE_URL.replace("postgresql+asyncpg", "postgresql")
if "psycopg" not in DATABASE_URL and "pg8000" not in DATABASE_URL:
    # default to psycopg2, which might be missing.
    pass

try:
    engine = create_engine(DATABASE_URL)
except ImportError:
    print("psycopg2 not found, trying to run async check...")
    engine = None

async def check_db_async():
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy import text
    
    engine_async = create_async_engine(settings.DATABASE_URL)
    
    async with engine_async.connect() as conn:
        print("\n--- Connecting Async ---")
        # Check categories
        try:
            result = await conn.execute(text("SELECT * FROM categories"))
            print("\n--- Categories Table Content ---")
            rows = result.fetchall()
            if rows:
                for row in rows:
                    print(row)
            else:
                print("Categories table is empty.")
        except Exception as e:
             print(f"Error querying categories: {e}")

        # Check lessons columns (manual sql query to info schema if inspect doesn't work async easily)
        print("\n--- Lessons Table Columns (via information_schema) ---")
        result = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lessons'"))
        for row in result.fetchall():
            print(f"{row[0]}: {row[1]}")

def check_db_sync():
    if not engine:
        return
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"Tables: {tables}")

    if 'categories' in tables:
        print("\n--- Categories Table Content ---")
        with engine.connect() as conn:
            result = conn.execute(text("SELECT * FROM categories"))
            for row in result:
                print(row)
    else:
        print("\n[WARNING] 'categories' table not found!")

    if 'lessons' in tables:
        print("\n--- Lessons Table Columns ---")
        columns = inspector.get_columns('lessons')
        for col in columns:
            print(f"{col['name']}: {col['type']}")

if __name__ == "__main__":
    if engine:
        try:
            check_db_sync()
        except Exception as e:
            print(f"Sync check failed: {e}")
            print("Attempting Async check...")
            asyncio.run(check_db_async())
    else:
        asyncio.run(check_db_async())
