"""add login_id to companies

Revision ID: 20260426_0004
Revises: 20260426_0003
Create Date: 2026-04-26
"""

from alembic import op
import sqlalchemy as sa

revision = "20260426_0004"
down_revision = "20260426_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("companies", sa.Column("login_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("companies", "login_id")
