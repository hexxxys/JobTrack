from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.company import Company
from app.models.event import Event
from app.models.status import Status
from app.models.user import User
from app.schemas.event import EventOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class SummaryOut(BaseModel):
    total_companies: int
    active_companies: int
    offers: int
    interviews_this_week: int
    upcoming_events_count: int


@router.get("/summary", response_model=SummaryOut)
def summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    week_later = now + timedelta(days=7)

    total = db.query(Company).filter(Company.user_id == current_user.id).count()

    # アーカイブ（不合格・辞退）以外の企業数
    active = (
        db.query(Company)
        .join(Status)
        .filter(Company.user_id == current_user.id, Status.is_archive == False)  # noqa: E712
        .count()
    )

    # 内定ステータスの企業数
    offers = (
        db.query(Company)
        .join(Status)
        .filter(Company.user_id == current_user.id, Status.name == "内定")
        .count()
    )

    # 今週の面接イベント数
    interviews_this_week = (
        db.query(Event)
        .join(Company)
        .filter(
            Company.user_id == current_user.id,
            Event.type.in_(["interview_1st", "interview_2nd", "interview_final"]),
            Event.scheduled_at >= now,
            Event.scheduled_at <= week_later,
        )
        .count()
    )

    # 今後のイベント総数
    upcoming = (
        db.query(Event)
        .join(Company)
        .filter(Company.user_id == current_user.id, Event.scheduled_at >= now)
        .count()
    )

    return SummaryOut(
        total_companies=total,
        active_companies=active,
        offers=offers,
        interviews_this_week=interviews_this_week,
        upcoming_events_count=upcoming,
    )


@router.get("/events/upcoming", response_model=list[EventOut])
def upcoming_events(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """ユーザーの今後のイベントを日時順に返す（最大50件）"""
    return (
        db.query(Event)
        .join(Company)
        .filter(
            Company.user_id == current_user.id,
            Event.scheduled_at >= datetime.now(timezone.utc).replace(tzinfo=None),
        )
        .order_by(Event.scheduled_at)
        .limit(50)
        .all()
    )
