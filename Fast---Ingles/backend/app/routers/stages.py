from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.stage import Stage
from pydantic import BaseModel

router = APIRouter(prefix="/api/stages", tags=["Stages"])

class StageResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    phase: Optional[str] = None
    level: str
    category: str
    word_count: int

    class Config:
        from_attributes = True

@router.get("/", response_model=List[StageResponse])
async def get_stages(db: AsyncSession = Depends(get_db)):
    """
    Get all curriculum stages/levels.
    """
    result = await db.execute(select(Stage).order_by(Stage.id))
    stages = result.scalars().all()
    return stages
