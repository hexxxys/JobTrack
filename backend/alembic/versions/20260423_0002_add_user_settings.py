"""add user settings table

Revision ID: 20260423_0002
Revises: 20260423_0001
Create Date: 2026-04-23 00:30:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "20260423_0002"
down_revision = "20260423_0001"
branch_labels = None
depends_on = None

NOW = sa.text("CURRENT_TIMESTAMP")


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("user_id", sa.String(36), nullable=False),
        sa.Column("show_archived_statuses", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("compact_cards", sa.Boolean(), nullable=False, server_default=sa.text("0")),
        sa.Column("upcoming_refresh_minutes", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=NOW),
        sa.PrimaryKeyConstraint("user_id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE", name="fk_user_settings_user"),
    )

    op.execute(
        sa.text(
            """
            INSERT INTO user_settings (user_id, show_archived_statuses, compact_cards, upcoming_refresh_minutes)
            SELECT id, 0, 0, 1 FROM users
            """
        )
    )


def downgrade() -> None:
    op.drop_table("user_settings")
