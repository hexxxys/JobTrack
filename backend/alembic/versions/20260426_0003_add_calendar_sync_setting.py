"""add calendar sync setting

Revision ID: 20260426_0003
Revises: 20260423_0002
Create Date: 2026-04-26 10:50:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "20260426_0003"
down_revision = "20260423_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_settings",
        sa.Column("calendar_sync_enabled", sa.Boolean(), nullable=False, server_default=sa.text("1")),
    )


def downgrade() -> None:
    op.drop_column("user_settings", "calendar_sync_enabled")
