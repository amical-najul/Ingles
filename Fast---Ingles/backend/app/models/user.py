from sqlalchemy import Column, String, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base
import uuid



class User(Base):
    """User model for authentication (Self-Hosted)."""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, nullable=True) # Name is optional
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False) # Stores Bcrypt hash
    role = Column(String, default="user")  # "user" or "admin"
    status = Column(String, default="active")  # "active" or "inactive"
    photo_url = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    progress = relationship("Progress", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")

