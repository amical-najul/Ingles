"""
System Diagnostics Model for System Check & Diagnosis feature.
Isolated table for test data, separate from production lessons.
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base
import uuid


class SystemDiagnostic(Base):
    """Stores test data for System Check runs."""
    __tablename__ = "system_diagnostics"
    
    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(36), nullable=False, index=True)  # UUID for grouping
    word = Column(String(100), nullable=False)
    pronunciation = Column(String(100), nullable=True)
    translation = Column(String(100), nullable=True)
    mnemonic = Column(String(500), nullable=True)
    minio_audio_key = Column(String(255), nullable=True)  # Path in MinIO
    audio_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    
    @staticmethod
    def generate_run_id() -> str:
        return str(uuid.uuid4())
