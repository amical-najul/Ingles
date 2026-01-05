"""
Migration script to create system_diagnostics table.
Run this script once to set up the table in the database.
"""

import asyncio
from sqlalchemy import text
from app.database import async_session


async def create_system_diagnostics_table():
    """Create the system_diagnostics table if it doesn't exist."""
    
    statements = [
        """
        CREATE TABLE IF NOT EXISTS system_diagnostics (
            id SERIAL PRIMARY KEY,
            run_id VARCHAR(36) NOT NULL,
            word VARCHAR(100) NOT NULL,
            pronunciation VARCHAR(100),
            translation VARCHAR(100),
            mnemonic VARCHAR(500),
            minio_audio_key VARCHAR(255),
            audio_verified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
        """,
        "CREATE INDEX IF NOT EXISTS idx_diagnostics_run_id ON system_diagnostics(run_id)",
        "CREATE INDEX IF NOT EXISTS idx_diagnostics_created ON system_diagnostics(created_at)"
    ]
    
    async with async_session() as session:
        for sql in statements:
            await session.execute(text(sql))
            await session.commit()
        print("✅ system_diagnostics table created successfully!")


if __name__ == "__main__":
    asyncio.run(create_system_diagnostics_table())
