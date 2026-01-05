"""
Create admin user script.
Uses environment variables for credentials.
"""
import asyncio
import os
import sys
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
from dotenv import load_dotenv

# Setup paths
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.dirname(current_dir)
env_path = os.path.join(backend_dir, '.env')

load_dotenv(env_path)
sys.path.insert(0, backend_dir)

from app.models.user import User
from app.utils.security import get_password_hash
from app.config import get_settings

# Database Setup
settings = get_settings()
DATABASE_URL = settings.DATABASE_URL

# Get admin credentials from environment
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@fastingles.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD')
ADMIN_NAME = os.environ.get('ADMIN_NAME', 'Administrator')

if not ADMIN_PASSWORD:
    print("ERROR: ADMIN_PASSWORD environment variable not set.")
    print("Please set it in your .env file.")
    exit(1)

async def create_admin():
    print(f"👑 Creating Admin in {settings.POSTGRES_DB}...")
    engine = create_async_engine(DATABASE_URL, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        # Check if exists
        result = await session.execute(select(User).where(User.email == ADMIN_EMAIL))
        existing_user = result.scalar_one_or_none()

        if existing_user:
            print(f"⚠️ User {ADMIN_EMAIL} already exists.")
            if existing_user.role != "admin":
                print("   Updating role to 'admin'...")
                existing_user.role = "admin"
                await session.commit()
                print("   ✅ Role updated.")
        else:
            print(f"🔨 Creating new admin user...")
            hashed_pw = get_password_hash(ADMIN_PASSWORD)
            new_admin = User(
                email=ADMIN_EMAIL,
                password_hash=hashed_pw,
                name=ADMIN_NAME,
                role="admin",
                status="active"
            )
            session.add(new_admin)
            await session.commit()
            print(f"✅ User {ADMIN_EMAIL} created successfully with 'admin' role.")

    await engine.dispose()

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(create_admin())
