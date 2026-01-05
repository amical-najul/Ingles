from sqlalchemy import Column, Integer, String, Boolean, Float, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # Appearance
    theme = Column(String, default="light")
    
    # Voice & Audio
    preferred_voice_uri = Column(String, nullable=True)
    speech_rate = Column(Float, default=0.9)
    
    # Study
    verb_repetitions = Column(Integer, default=1)
    visualization_seconds = Column(Integer, default=20)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship to User
    user = relationship("User", back_populates="settings")
