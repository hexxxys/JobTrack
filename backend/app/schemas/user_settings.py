from datetime import datetime

from pydantic import BaseModel, Field


class UserSettingsOut(BaseModel):
    show_archived_statuses: bool
    compact_cards: bool
    upcoming_refresh_minutes: int = Field(ge=1, le=10)
    calendar_sync_enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserSettingsUpdate(BaseModel):
    show_archived_statuses: bool | None = None
    compact_cards: bool | None = None
    upcoming_refresh_minutes: int | None = Field(default=None, ge=1, le=10)
    calendar_sync_enabled: bool | None = None
