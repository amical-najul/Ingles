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

load_dotenv(env_path)

# Credentials
user = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")
host = os.getenv("POSTGRES_HOST")
port = os.getenv("POSTGRES_PORT", "5432")
dbname = os.getenv("POSTGRES_DB")

DATABASE_URL = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{dbname}"

async def seed_data():
    print(f"🌱 Sembrando datos en {dbname}...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.begin() as conn:
            # 1. Levels
            print("   - Insertando Levels...")
            await conn.execute(text("""
                INSERT INTO levels (name, difficulty_order, description) VALUES
                ('A1', 1, 'Beginner'),
                ('A2', 2, 'Elementary'),
                ('B1', 3, 'Intermediate'),
                ('B2', 4, 'Upper Intermediate'),
                ('C1', 5, 'Advanced')
                ON CONFLICT (name) DO NOTHING;
            """))
            
            # 2. Categories
            print("   - Insertando Categories...")
            await conn.execute(text("""
                INSERT INTO categories (name, slug, description) VALUES
                ('Grammar', 'grammar', 'Grammar rules and structures'),
                ('Vocabulary', 'vocabulary', 'Word lists and usage'),
                ('Conversation', 'conversation', 'Dialogues and speaking practice')
                ON CONFLICT (name) DO NOTHING;
            """))
            
            print("✅ Sembrado completado.")
            
    except Exception as e:
        print(f"❌ Error sembrando datos: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_data())
