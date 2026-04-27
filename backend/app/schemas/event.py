from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class EventType(str, Enum):
    es_deadline = "es_deadline"
    interview_1st = "interview_1st"
    interview_2nd = "interview_2nd"
    interview_final = "interview_final"
    briefing = "briefing"
    offer = "offer"
    other = "other"


class EventCreate(BaseModel):
    type: EventType
    title: str = Field(..., max_length=200)
    scheduled_at: datetime
    notes: str | None = None


class EventUpdate(BaseModel):
    type: EventType | None = None
    title: str | None = Field(None, max_length=200)
    scheduled_at: datetime | None = None
    notes: str | None = None


class EventOut(BaseModel):
    id: str
    company_id: str
    type: EventType
    title: str
    scheduled_at: datetime
    notes: str | None
    google_event_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class EventMutationOut(EventOut):
    calendar_sync_error: str | None = None
