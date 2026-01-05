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

REQUIRED_TABLES = {
    "users", "levels", "categories", "lessons", "progress", "audio_cache"
}

async def verify_schema():
    print(f"🔍 Conectando a {dbname} en {host}...")
    
    engine = create_async_engine(DATABASE_URL, echo=False)
    
    try:
        async with engine.connect() as conn:
            # 1. Check Tables
            result = await conn.execute(text(
                "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
            ))
            existing_tables = {row[0] for row in result.fetchall()}
            
            print("\n📋 Tablas encontradas:")
            for t in existing_tables:
                print(f"  - {t}")
                
            missing = REQUIRED_TABLES - existing_tables
            if missing:
                print(f"\n❌ FALTAN TABLAS: {missing}")
            else:
                print("\n✅ TODAS las tablas requeridas están presentes.")

            # 2. Check Seed Data
            print("\n🌱 Verificando datos semilla:")
            
            # Count Levels
            if "levels" in existing_tables:
                res = await conn.execute(text("SELECT count(*) FROM levels"))
                count = res.scalar()
                print(f"  - Levels: {count} registros (Esperado: >0)")
                
            # Count Categories
            if "categories" in existing_tables:
                res = await conn.execute(text("SELECT count(*) FROM categories"))
                count = res.scalar()
                print(f"  - Categories: {count} registros (Esperado: >0)")

            # Check Users Structure (Password Hash column)
            if "users" in existing_tables:
                res = await conn.execute(text(
                    "SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name='password_hash'"
                ))
                if res.scalar():
                    print("  - Tabla 'users': Columna 'password_hash' ✅ PRESENTE")
                else:
                    print("  - Tabla 'users': Columna 'password_hash' ❌ FALTA")

    except Exception as e:
        print(f"\n❌ Error de conexión o verificación: {e}")
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(verify_schema())
