from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.user_settings import UserSettingsResponse, UserSettingsUpdate
from app.utils.security import get_current_user

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"]
)

@router.get("", response_model=UserSettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user settings."""
    # Try to fetch existing settings
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    settings = result.scalar_one_or_none()
    
    # If not found, create default
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
        
    return settings

@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    settings_data: UserSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update user settings."""
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == current_user.id))
    settings = result.scalar_one_or_none()
    
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
    
    # Update fields
    if settings_data.theme is not None:
        settings.theme = settings_data.theme
    if settings_data.preferred_voice_uri is not None:
        settings.preferred_voice_uri = settings_data.preferred_voice_uri
    if settings_data.speech_rate is not None:
        settings.speech_rate = settings_data.speech_rate
    if settings_data.verb_repetitions is not None:
        settings.verb_repetitions = settings_data.verb_repetitions
    if settings_data.visualization_seconds is not None:
        settings.visualization_seconds = settings_data.visualization_seconds
        
    await db.commit()
    await db.refresh(settings)
    return settings
