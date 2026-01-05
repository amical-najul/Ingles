from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AIConfigBase(BaseModel):
    provider: str
    api_key: Optional[str] = None
    model: str
    is_active: bool = False

class AIConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    model: Optional[str] = None
    is_active: Optional[bool] = None

class AIConfigResponse(AIConfigBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AIProviderStatus(BaseModel):
    active_provider: Optional[str] = None
