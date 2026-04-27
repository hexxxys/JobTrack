from datetime import datetime

from pydantic import BaseModel, Field, HttpUrl


class CompanyCreate(BaseModel):
    status_id: str
    name: str = Field(..., max_length=255)
    industry: str | None = Field(None, max_length=100)
    priority: int = Field(3, ge=1, le=5)
    notes: str | None = None
    url: HttpUrl | None = None
    login_id: str | None = Field(None, max_length=255)


class CompanyUpdate(BaseModel):
    status_id: str | None = None
    name: str | None = Field(None, max_length=255)
    industry: str | None = Field(None, max_length=100)
    priority: int | None = Field(None, ge=1, le=5)
    notes: str | None = None
    url: HttpUrl | None = None
    login_id: str | None = Field(None, max_length=255)


class CompanyOut(BaseModel):
    id: str
    status_id: str
    name: str
    industry: str | None
    priority: int
    notes: str | None
    url: str | None
    login_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
