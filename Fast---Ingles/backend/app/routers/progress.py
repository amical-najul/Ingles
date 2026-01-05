from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.progress import Progress
from app.models.user import User
from app.utils.security import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/progress", tags=["Progress"])

class ProgressUpdate(BaseModel):
    day_id: int
    current_index: int
    completed: int = 0
    score: int = 0

class ProgressResponse(BaseModel):
    day_id: int
    current_index: int
    completed: int
    score: int

@router.get("/", response_model=List[ProgressResponse])
async def get_all_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all progress for current user."""
    result = await db.execute(
        select(Progress).where(Progress.user_id == current_user.id)
    )
    return result.scalars().all()  

@router.get("/{day_id}", response_model=ProgressResponse)
async def get_progress(
    day_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get progress for a specific lesson."""
    result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.day_id == day_id
        )
    )
    progress = result.scalar_one_or_none()
    
    if not progress:
        return ProgressResponse(day_id=day_id, current_index=0, completed=0, score=0)
    
    return progress

@router.post("", response_model=ProgressResponse)
async def update_progress(
    request: ProgressUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update progress for a lesson."""
    result = await db.execute(
        select(Progress).where(
            Progress.user_id == current_user.id,
            Progress.day_id == request.day_id
        )
    )
    progress = result.scalar_one_or_none()
    
    if progress:
        progress.current_index = request.current_index
        progress.completed = request.completed
        progress.score = request.score
    else:
        progress = Progress(
            user_id=current_user.id,
            day_id=request.day_id,
            current_index=request.current_index,
            completed=request.completed,
            score=request.score
        )
        db.add(progress)
    
    await db.commit()
    await db.refresh(progress)
    return progress
