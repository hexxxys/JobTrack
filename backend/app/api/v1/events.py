from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.api.deps import bearer_scheme, get_current_user
from app.core.google_calendar import create_google_event, delete_google_event, update_google_event
from app.core.database import get_db
from app.core.security import decode_nextauth_token
from app.models.company import Company
from app.models.event import Event
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.event import EventCreate, EventMutationOut, EventOut, EventUpdate

import logging
logger = logging.getLogger(__name__)

router = APIRouter(tags=["events"])


def _get_company_or_404(company_id: str, user_id: str, db: Session) -> Company:
    company = db.query(Company).filter(Company.id == company_id, Company.user_id == user_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="企業が見つかりません")
    return company


def _get_event_or_404(event_id: str, user_id: str, db: Session) -> Event:
    event = (
        db.query(Event)
        .join(Company)
        .filter(Event.id == event_id, Company.user_id == user_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="イベントが見つかりません")
    return event


def _google_access_token_from_credentials(credentials: HTTPAuthorizationCredentials) -> str | None:
    payload = decode_nextauth_token(credentials.credentials)
    token = payload.get("google_access_token")
    return token if isinstance(token, str) and token else None


def _is_calendar_sync_enabled(db: Session, user_id: str) -> bool:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    if not settings:
        return True
    return bool(settings.calendar_sync_enabled)


def _pop_company_google_event_id(db: Session, company_id: str, exclude_event_id: str | None = None) -> str | None:
    """企業の既存イベントから google_event_id を取り出して返す（取り出したら元を None にする）"""
    existing = (
        db.query(Event)
        .filter(
            Event.company_id == company_id,
            Event.google_event_id.isnot(None),
            *([] if exclude_event_id is None else [Event.id != exclude_event_id]),
        )
        .first()
    )
    if not existing:
        return None
    gid = existing.google_event_id
    existing.google_event_id = None
    return gid


@router.get("/companies/{company_id}/events", response_model=list[EventOut])
def list_events(
    company_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _get_company_or_404(company_id, current_user.id, db)
    return (
        db.query(Event)
        .filter(Event.company_id == company_id)
        .order_by(Event.scheduled_at)
        .all()
    )


@router.post("/companies/{company_id}/events", response_model=EventMutationOut, status_code=status.HTTP_201_CREATED)
def create_event(
    company_id: str,
    body: EventCreate,
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    company = _get_company_or_404(company_id, current_user.id, db)
    event = Event(**body.model_dump(), company_id=company_id)
    calendar_sync_error: str | None = None

    if _is_calendar_sync_enabled(db, current_user.id):
        google_access_token = _google_access_token_from_credentials(credentials)
        if not google_access_token:
            calendar_sync_error = "Google連携トークンが見つからないため、カレンダー同期をスキップしました"
        else:
            # 企業に既存の google_event_id があれば上書き更新、なければ新規作成
            existing_gid = _pop_company_google_event_id(db, company_id)
            if existing_gid:
                err = update_google_event(
                    access_token=google_access_token,
                    google_event_id=existing_gid,
                    title=event.title,
                    scheduled_at=event.scheduled_at,
                    notes=event.notes,
                    company_name=company.name,
                )
                event.google_event_id = existing_gid
                calendar_sync_error = err
            else:
                google_event_id, sync_error = create_google_event(
                    access_token=google_access_token,
                    title=event.title,
                    scheduled_at=event.scheduled_at,
                    notes=event.notes,
                    company_name=company.name,
                )
                event.google_event_id = google_event_id
                calendar_sync_error = sync_error

    db.add(event)
    db.commit()
    db.refresh(event)
    return {
        **EventOut.model_validate(event).model_dump(),
        "calendar_sync_error": calendar_sync_error,
    }


@router.patch("/events/{event_id}", response_model=EventMutationOut)
def update_event(
    event_id: str,
    body: EventUpdate,
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, current_user.id, db)
    company = _get_company_or_404(event.company_id, current_user.id, db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    calendar_sync_error: str | None = None
    if _is_calendar_sync_enabled(db, current_user.id):
        google_access_token = _google_access_token_from_credentials(credentials)
        if not google_access_token:
            calendar_sync_error = "Google連携トークンが見つからないため、カレンダー同期をスキップしました"
        elif event.google_event_id:
            calendar_sync_error = update_google_event(
                access_token=google_access_token,
                google_event_id=event.google_event_id,
                title=event.title,
                scheduled_at=event.scheduled_at,
                notes=event.notes,
                company_name=company.name,
            )
        else:
            google_event_id, sync_error = create_google_event(
                access_token=google_access_token,
                title=event.title,
                scheduled_at=event.scheduled_at,
                notes=event.notes,
                company_name=company.name,
            )
            event.google_event_id = google_event_id
            calendar_sync_error = sync_error

    db.commit()
    db.refresh(event)
    return {
        **EventOut.model_validate(event).model_dump(),
        "calendar_sync_error": calendar_sync_error,
    }



@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    event = _get_event_or_404(event_id, current_user.id, db)

    if _is_calendar_sync_enabled(db, current_user.id):
        google_access_token = _google_access_token_from_credentials(credentials)
        if google_access_token and event.google_event_id:
            delete_google_event(
                access_token=google_access_token,
                google_event_id=event.google_event_id,
            )

    db.delete(event)
    db.commit()
