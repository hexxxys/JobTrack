from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_nextauth_token
from app.models.status import Status
from app.models.user import User
from app.models.user_settings import UserSettings

bearer_scheme = HTTPBearer()

_DEFAULT_STATUSES = [
    ("説明会",     "#06B6D4",  1, False),
    ("エントリー", "#3B82F6",  2, False),
    ("ES提出",     "#8B5CF6",  3, False),
    ("書類選考",   "#F59E0B",  4, False),
    ("一次面接",   "#F97316",  5, False),
    ("二次面接",   "#EF4444",  6, False),
    ("最終面接",   "#EC4899",  7, False),
    ("内定",       "#10B981",  8, False),
    ("不合格",     "#6B7280",  9, True),
    ("辞退",       "#9CA3AF", 10, True),
]


def _create_user_with_defaults(db: Session, email: str, name: str, google_id: str, image: str | None) -> User:
    """初回ログイン時にユーザーとデフォルトステータスを一括作成する"""
    user = User(id=str(uuid4()), email=email, name=name, google_id=google_id, image=image)
    db.add(user)
    db.flush()  # user.id を確定させてから statuses を追加

    for s_name, color, position, is_archive in _DEFAULT_STATUSES:
        db.add(Status(
            id=str(uuid4()),
            user_id=user.id,
            name=s_name,
            color=color,
            position=position,
            is_default=True,
            is_archive=is_archive,
        ))

    db.add(UserSettings(user_id=user.id))

    db.commit()
    db.refresh(user)
    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    payload = decode_nextauth_token(credentials.credentials)
    email: str | None = payload.get("email")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="トークンにemailが含まれていません")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        name = payload.get("name") or email
        google_id = payload.get("sub") or email
        image = payload.get("picture")
        user = _create_user_with_defaults(db, email, name, google_id, image)
    else:
        # ステータスが0件の場合（初回作成失敗）は補完する
        count = db.query(Status).filter(Status.user_id == user.id).count()
        if count == 0:
            for s_name, color, position, is_archive in _DEFAULT_STATUSES:
                db.add(Status(
                    id=str(uuid4()),
                    user_id=user.id,
                    name=s_name,
                    color=color,
                    position=position,
                    is_default=True,
                    is_archive=is_archive,
                ))
            db.commit()

    return user
