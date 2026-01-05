from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UserSettingsBase(BaseModel):
    theme: Optional[str] = "light"
    preferred_voice_uri: Optional[str] = None
    speech_rate: Optional[float] = 0.9
    verb_repetitions: Optional[int] = 1
    visualization_seconds: Optional[int] = 20

class UserSettingsUpdate(UserSettingsBase):
    pass

from uuid import UUID

class UserSettingsResponse(UserSettingsBase):
    id: int
    user_id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
