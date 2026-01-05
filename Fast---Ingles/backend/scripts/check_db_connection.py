import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from dotenv import load_dotenv

# Force load .env from the parent directory if running from scripts/
current_dir = os.path.dirname(os.path.abspath(__file__))
env_path = os.path.join(os.path.dirname(current_dir), '.env')

print(f"🔍 Buscando archivo .env en: {env_path}")
load_dotenv(env_path)

# Construct Database URL
user = os.getenv("POSTGRES_USER")
password = os.getenv("POSTGRES_PASSWORD")
host = os.getenv("POSTGRES_HOST")
port = os.getenv("POSTGRES_PORT", "5432")
dbname = os.getenv("POSTGRES_DB")

if not all([user, password, host, dbname]):
    print("❌ ERROR: Faltan variables de entorno para la base de datos.")
    print("Asegúrese de haber configurado POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST y POSTGRES_DB en backend/.env")
    sys.exit(1)

DATABASE_URL = f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{dbname}"

async def check_connection():
    print(f"🔄 Intentando conectar a: {host}:{port}/{dbname} (Usuario: {user})")
    
    try:
        engine = create_async_engine(DATABASE_URL, echo=False)
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print("\n✅ ¡CONEXIÓN EXITOSA!")
            print(f"📊 Versión de PostgreSQL: {version}")
            
    except Exception as e:
        print("\n❌ FALLÓ LA CONEXIÓN")
        print(f"Error: {str(e)}")
        sys.exit(1)
    finally:
        await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(check_connection())
