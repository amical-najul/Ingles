from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from app.database import get_db
from app.models.ai_config import AIConfig
from app.schemas.ai_config import AIConfigResponse, AIConfigUpdate
from app.utils.security import get_current_admin

router = APIRouter(
    prefix="/api/admin/ai-config",
    tags=["admin-ai"],
    responses={404: {"description": "Not found"}},
)

@router.get("", response_model=List[AIConfigResponse])
async def get_ai_configs(
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """List all AI provider configurations."""
    result = await db.execute(select(AIConfig).order_by(AIConfig.id))
    configs = result.scalars().all()
    return configs

@router.put("/{provider}", response_model=AIConfigResponse)
async def update_ai_config(
    provider: str,
    config_update: AIConfigUpdate,
    db: AsyncSession = Depends(get_db),
    admin=Depends(get_current_admin)
):
    """Update AI provider configuration (key, model, status)."""
    result = await db.execute(select(AIConfig).where(AIConfig.provider == provider))
    db_config = result.scalar_one_or_none()
    
    if not db_config:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    # If setting to active, deactivate others
    if config_update.is_active is True:
        await db.execute(
            AIConfig.__table__.update().where(AIConfig.provider != provider).values(is_active=False)
        )
    
    # Update fields
    if config_update.api_key is not None:
        db_config.api_key = config_update.api_key
    if config_update.model is not None:
        db_config.model = config_update.model
    if config_update.is_active is not None:
        db_config.is_active = config_update.is_active
        
    await db.commit()
    await db.refresh(db_config)
    return db_config
