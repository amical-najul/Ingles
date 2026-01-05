from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from app.database import Base

class Stage(Base):
    """
    Curriculum Stage definition (formerly defined in constants.ts).
    Defines the structure of the course (Level 1, Level 2, etc.)
    """
    __tablename__ = "stages"

    id = Column(Integer, primary_key=True, index=True) # Maps to day_id
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    icon = Column(String, nullable=True)
    phase = Column(String, nullable=True)
    level = Column(String, nullable=False) # A1, A2, etc.
    category = Column(String, nullable=False) # verbs, adjectives, etc.
    word_count = Column(Integer, default=50)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
