"""add briefing status column

Revision ID: 20260427_0005
Revises: 20260426_0004
Create Date: 2026-04-27
"""

from uuid import uuid4
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision = "20260427_0005"
down_revision = "20260426_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # 既存の全ユーザーの position を +1 してから 説明会 を position=1 に挿入
    conn.execute(text(
        "UPDATE statuses SET position = position + 1 WHERE is_default = TRUE"
    ))

    users = conn.execute(text("SELECT id FROM users")).fetchall()
    for (user_id,) in users:
        conn.execute(text(
            "INSERT INTO statuses (id, user_id, name, color, position, is_default, is_archive) "
            "VALUES (:id, :user_id, :name, :color, :position, :is_default, :is_archive)"
        ), {
            "id": str(uuid4()),
            "user_id": user_id,
            "name": "説明会",
            "color": "#06B6D4",
            "position": 1,
            "is_default": True,
            "is_archive": False,
        })


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(text("DELETE FROM statuses WHERE name = '説明会' AND is_default = TRUE"))
    conn.execute(text(
        "UPDATE statuses SET position = position - 1 WHERE is_default = TRUE AND position > 1"
    ))
