import logging

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.api.deps import bearer_scheme, get_current_user
from app.core.database import get_db
from app.core.google_calendar import _request, create_google_event, update_google_event
from app.core.security import decode_nextauth_token
from app.models.company import Company
from app.models.event import Event
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _google_token(credentials: HTTPAuthorizationCredentials) -> str | None:
    payload = decode_nextauth_token(credentials.credentials)
    token = payload.get("google_access_token")
    return token if isinstance(token, str) and token else None


@router.get("/check")
def calendar_check(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
):
    token = _google_token(credentials)
    has_token = token is not None

    result = {
        "has_google_access_token": has_token,
        "token_preview": (token[:12] + "...") if has_token else None,
        "calendar_api_test": None,
        "error": None,
    }

    if has_token:
        res, err = _request("?maxResults=1", token, method="GET")
        result["calendar_api_test"] = "ok" if err is None else "failed"
        result["error"] = err

    return result


@router.post("/sync-all")
def sync_all_events(
    current_user: User = Depends(get_current_user),
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    google_access_token = _google_token(credentials)
    if not google_access_token:
        return {"synced": 0, "skipped": 0, "error": "Google連携トークンがありません。再ログインしてください。"}

    companies = db.query(Company).filter(Company.user_id == current_user.id).all()

    synced, skipped = 0, 0
    for company in companies:
        latest = (
            db.query(Event)
            .filter(Event.company_id == company.id)
            .order_by(Event.scheduled_at.desc())
            .first()
        )
        if not latest:
            continue

        # 企業に既存の google_event_id があれば更新、なければ新規作成
        existing_gid = latest.google_event_id
        if not existing_gid:
            other = (
                db.query(Event)
                .filter(Event.company_id == company.id, Event.google_event_id.isnot(None), Event.id != latest.id)
                .first()
            )
            if other:
                existing_gid = other.google_event_id
                other.google_event_id = None

        if existing_gid:
            err = update_google_event(
                access_token=google_access_token,
                google_event_id=existing_gid,
                title=latest.title,
                scheduled_at=latest.scheduled_at,
                notes=latest.notes,
                company_name=company.name,
            )
            if not err:
                latest.google_event_id = existing_gid
                synced += 1
            else:
                logger.error("sync_all update [%s]: %s", company.name, err)
                skipped += 1
        else:
            gid, err = create_google_event(
                access_token=google_access_token,
                title=latest.title,
                scheduled_at=latest.scheduled_at,
                notes=latest.notes,
                company_name=company.name,
            )
            if gid:
                latest.google_event_id = gid
                synced += 1
            else:
                logger.error("sync_all create [%s]: %s", company.name, err)
                skipped += 1

    db.commit()
    return {"synced": synced, "skipped": skipped, "error": None}
