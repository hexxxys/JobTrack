from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    show_archived_statuses: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    compact_cards: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    upcoming_refresh_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    calendar_sync_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime, nullable=False, server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(
        DateTime, nullable=False, server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="settings")  # noqa: F821
