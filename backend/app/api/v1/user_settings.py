from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.user_settings import UserSettings
from app.schemas.user_settings import UserSettingsOut, UserSettingsUpdate

router = APIRouter(prefix="/users", tags=["users"])


def _ensure_user_settings(db: Session, current_user: User) -> UserSettings:
    settings = (
        db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    )
    if settings:
        return settings

    settings = UserSettings(user_id=current_user.id)
    db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/me/settings", response_model=UserSettingsOut)
def get_my_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _ensure_user_settings(db, current_user)


@router.patch("/me/settings", response_model=UserSettingsOut)
def update_my_settings(
    body: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    settings = _ensure_user_settings(db, current_user)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)
    return settings
