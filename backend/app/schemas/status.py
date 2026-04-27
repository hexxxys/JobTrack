from datetime import datetime

from pydantic import BaseModel, Field


class StatusCreate(BaseModel):
    name: str = Field(..., max_length=100)
    color: str = Field("#6B7280", pattern=r"^#[0-9A-Fa-f]{6}$")
    position: int = Field(0, ge=0)
    is_archive: bool = False


class StatusUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    position: int | None = Field(None, ge=0)
    is_archive: bool | None = None


class StatusOut(BaseModel):
    id: str
    name: str
    color: str
    position: int
    is_default: bool
    is_archive: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
