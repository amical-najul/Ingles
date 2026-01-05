"""
Database deployment script.
Creates database and applies schema using environment variables.
"""
import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from dotenv import load_dotenv

# Setup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
env_path = os.path.join(backend_dir, '.env')
schema_path = os.path.join(backend_dir, 'schema_full.sql')

load_dotenv(env_path)

# Get credentials from environment
user = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")
host = os.getenv("POSTGRES_HOST")
port = os.getenv("POSTGRES_PORT", "5432")
maintenance_db = os.getenv("POSTGRES_MAINTENANCE_DB", "postgres")  # Default maintenance DB
target_db = os.getenv("POSTGRES_DB")  # Target database name from .env

if not all([user, password, host, target_db]):
    print("ERROR: Missing required environment variables:")
    print("  - POSTGRES_USER")
    print("  - POSTGRES_PASSWORD")
    print("  - POSTGRES_HOST")
    print("  - POSTGRES_DB")
    sys.exit(1)

async def deploy():
    # 1. Connect to Maintenance DB to Create New DB
    maintenance_url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{maintenance_db}"
    print(f"🔌 Connecting to {maintenance_db} for management...")
    
    # We need isolation_level="AUTOCOMMIT" to run CREATE DATABASE
    engine = create_async_engine(maintenance_url, isolation_level="AUTOCOMMIT", echo=False)
    
    try:
        async with engine.connect() as conn:
            # Check if exists
            result = await conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{target_db}'"))
            exists = result.scalar()
            
            if not exists:
                print(f"🔨 Creating database: {target_db}...")
                await conn.execute(text(f"CREATE DATABASE {target_db}"))
                print("✅ Database created.")
            else:
                print(f"ℹ️ Database {target_db} already exists.")
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        return
    finally:
        await engine.dispose()

    # 2. Connect to Target DB and Apply Schema
    target_url = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{target_db}"
    print(f"\n🚀 Connecting to {target_db} to apply schema...")
    
    engine_target = create_async_engine(target_url, echo=False)
    
    try:
        # Read Schema SQL
        if not os.path.exists(schema_path):
            print(f"❌ Schema file not found: {schema_path}")
            return
            
        with open(schema_path, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
        
        async with engine_target.begin() as conn:
            print("📜 Applying schema_full.sql...")
            # Split commands by semicolon
            commands = schema_sql.split(';')
            for cmd in commands:
                if cmd.strip():
                    await conn.execute(text(cmd))
            print("✅ Schema applied successfully.")
            
    except Exception as e:
        print(f"❌ Error applying schema: {e}")
    finally:
        await engine_target.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(deploy())
