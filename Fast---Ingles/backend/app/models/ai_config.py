from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from app.database import Base

class AIConfig(Base):
    """Model for storing AI provider configuration."""
    __tablename__ = "ai_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, unique=True, nullable=False, index=True)
    api_key = Column(String, nullable=True)
    model = Column(String, nullable=False)
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
