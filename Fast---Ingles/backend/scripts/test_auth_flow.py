import asyncio
import os
import sys
import uuid
import logging
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, text
from dotenv import load_dotenv

# Setup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
env_path = os.path.join(backend_dir, '.env')

load_dotenv(env_path)

# Add backend to sys.path to import app modules
sys.path.insert(0, backend_dir)

from app.models.user import User
from app.utils.security import get_password_hash, verify_password, create_access_token, decode_access_token
from app.database import get_db

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AuthTest")

# Database Setup
user_db = os.getenv("POSTGRES_USER")
password_db = os.getenv("POSTGRES_PASSWORD")
host_db = os.getenv("POSTGRES_HOST")
port_db = os.getenv("POSTGRES_PORT", "5432")
dbname = os.getenv("POSTGRES_DB")

DATABASE_URL = f"postgresql+asyncpg://{user_db}:{password_db}@{host_db}:{port_db}/{dbname}"

async def test_auth_flow():
    print(f"🔄 Conectando a {dbname} para prueba de flujo de auth...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_pass = "secret123"
    
    print(f"🧪 Usuario de prueba: {test_email}")

    try:
        async with async_session() as session:
            # 1. REGISTER (Simulated)
            print("\n--- PASO 1: REGISTRO ---")
            hashed_pw = get_password_hash(test_pass)
            new_user = User(
                email=test_email,
                password_hash=hashed_pw,
                name="Test User",
                role="tester",
                status="active"
            )
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            print(f"✅ Usuario registrado: ID={new_user.id} Hash={new_user.password_hash[:10]}...")

            # 2. LOGIN (Verify Password)
            print("\n--- PASO 2: LOGIN (Verificar Password) ---")
            result = await session.execute(select(User).where(User.email == test_email))
            fetched_user = result.scalar_one_or_none()
            
            if fetched_user and verify_password(test_pass, fetched_user.password_hash):
                print("✅ Contraseña verificada correctamente.")
            else:
                print("❌ FALLO en verificación de contraseña.")
                return

            # 3. JWT GENERATION
            print("\n--- PASO 3: GENERACIÓN DE TOKEN ---")
            token = create_access_token({"sub": fetched_user.email})
            print(f"✅ Token generado: {token[:20]}...")

            # 4. JWT VALIDATION
            print("\n--- PASO 4: VALIDACIÓN DE TOKEN ---")
            payload = decode_access_token(token)
            if payload and payload.get("sub") == test_email:
                print(f"✅ Token decodificado correctamente. Sub: {payload.get('sub')}")
            else:
                print("❌ FALLO al decodificar token.")

    except Exception as e:
        print(f"❌ Error en la prueba: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await engine.dispose()
    print("\n🎉 PRUEBA DE AUTH FINALIZADA.")
