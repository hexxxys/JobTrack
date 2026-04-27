import json
import logging
import os
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

logger = logging.getLogger(__name__)

# 環境変数でモックサーバーに向け替えられる（開発用）
GOOGLE_CALENDAR_BASE = os.getenv(
    "GOOGLE_CALENDAR_BASE_URL",
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
)


def _request(
    path: str, access_token: str, method: str = "GET", body: dict | None = None
) -> tuple[dict | None, str | None]:
    url = f"{GOOGLE_CALENDAR_BASE}{path}"
    req = Request(
        url,
        method=method,
        headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        data=json.dumps(body).encode("utf-8") if body is not None else None,
    )
    try:
        with urlopen(req, timeout=10) as res:
            if res.status == 204:
                return None, None
            return json.loads(res.read().decode("utf-8")), None
    except HTTPError as exc:
        body_text = exc.read().decode("utf-8", errors="replace")
        msg = f"Google Calendar API エラー (HTTP {exc.code}): {body_text[:300]}"
        logger.error(msg)
        return None, msg
    except URLError as exc:
        msg = f"Google Calendar API 接続エラー: {exc.reason}"
        logger.error(msg)
        return None, msg
    except Exception as exc:
        msg = f"Google Calendar API 予期しないエラー: {exc}"
        logger.error(msg)
        return None, msg


def create_google_event(
    access_token: str, title: str, scheduled_at, notes: str | None, company_name: str
) -> tuple[str | None, str | None]:
    end_at = scheduled_at + timedelta(hours=1)
    payload = {
        "summary": f"{company_name} - {title}",
        "description": notes or "",
        "start": {"dateTime": scheduled_at.isoformat(), "timeZone": "Asia/Tokyo"},
        "end": {"dateTime": end_at.isoformat(), "timeZone": "Asia/Tokyo"},
    }
    res, err = _request("", access_token, method="POST", body=payload)
    if err:
        return None, err
    return (res.get("id") if res else None), None


def update_google_event(
    access_token: str, google_event_id: str, title: str, scheduled_at, notes: str | None, company_name: str
) -> str | None:
    end_at = scheduled_at + timedelta(hours=1)
    payload = {
        "summary": f"{company_name} - {title}",
        "description": notes or "",
        "start": {"dateTime": scheduled_at.isoformat(), "timeZone": "Asia/Tokyo"},
        "end": {"dateTime": end_at.isoformat(), "timeZone": "Asia/Tokyo"},
    }
    _, err = _request(f"/{google_event_id}", access_token, method="PATCH", body=payload)
    return err


def delete_google_event(access_token: str, google_event_id: str) -> str | None:
    _, err = _request(f"/{google_event_id}", access_token, method="DELETE")
    return err
