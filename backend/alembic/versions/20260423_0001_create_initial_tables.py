"""create initial tables

Revision ID: 20260423_0001
Revises:
Create Date: 2026-04-23 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "20260423_0001"
down_revision = None
branch_labels = None
depends_on = None

NOW = sa.text("CURRENT_TIMESTAMP")  # SQLite / 標準SQL 共通


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id",         sa.String(36),  nullable=False),
        sa.Column("email",      sa.String(255), nullable=False),
        sa.Column("name",       sa.String(255), nullable=False),
        sa.Column("image",      sa.String(512), nullable=True),
        sa.Column("google_id",  sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(),  nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(),  nullable=False, server_default=NOW),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email",     name="uq_users_email"),
        sa.UniqueConstraint("google_id", name="uq_users_google_id"),
    )

    op.create_table(
        "statuses",
        sa.Column("id",         sa.String(36),  nullable=False),
        sa.Column("user_id",    sa.String(36),  nullable=False),
        sa.Column("name",       sa.String(100), nullable=False),
        sa.Column("color",      sa.String(7),   nullable=False, server_default=sa.text("'#6B7280'")),
        sa.Column("position",   sa.Integer(),   nullable=False, server_default=sa.text("0")),
        sa.Column("is_default", sa.Boolean(),   nullable=False, server_default=sa.text("0")),
        sa.Column("is_archive", sa.Boolean(),   nullable=False, server_default=sa.text("0")),
        sa.Column("created_at", sa.DateTime(),  nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(),  nullable=False, server_default=NOW),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE", name="fk_statuses_user"),
    )
    op.create_index("idx_statuses_user_position", "statuses", ["user_id", "position"])

    op.create_table(
        "companies",
        sa.Column("id",         sa.String(36),   nullable=False),
        sa.Column("user_id",    sa.String(36),   nullable=False),
        sa.Column("status_id",  sa.String(36),   nullable=False),
        sa.Column("name",       sa.String(255),  nullable=False),
        sa.Column("industry",   sa.String(100),  nullable=True),
        sa.Column("priority",   sa.SmallInteger(), nullable=False, server_default=sa.text("3")),
        sa.Column("notes",      sa.Text(),       nullable=True),
        sa.Column("url",        sa.String(512),  nullable=True),
        sa.Column("created_at", sa.DateTime(),   nullable=False, server_default=NOW),
        sa.Column("updated_at", sa.DateTime(),   nullable=False, server_default=NOW),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"],   ["users.id"],    ondelete="CASCADE", name="fk_companies_user"),
        sa.ForeignKeyConstraint(["status_id"], ["statuses.id"],                     name="fk_companies_status"),
    )
    op.create_index("idx_companies_user_status",  "companies", ["user_id", "status_id"])
    op.create_index("idx_companies_user_updated", "companies", ["user_id", "updated_at"])

    op.create_table(
        "events",
        sa.Column("id",              sa.String(36),  nullable=False),
        sa.Column("company_id",      sa.String(36),  nullable=False),
        sa.Column("type",            sa.String(50),  nullable=False),
        sa.Column("title",           sa.String(200), nullable=False),
        sa.Column("scheduled_at",    sa.DateTime(),  nullable=False),
        sa.Column("notes",           sa.Text(),      nullable=True),
        sa.Column("google_event_id", sa.String(255), nullable=True),
        sa.Column("created_at",      sa.DateTime(),  nullable=False, server_default=NOW),
        sa.Column("updated_at",      sa.DateTime(),  nullable=False, server_default=NOW),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE", name="fk_events_company"),
    )
    op.create_index("idx_events_company_schedule", "events", ["company_id", "scheduled_at"])
    op.create_index("idx_events_schedule",         "events", ["scheduled_at"])


def downgrade() -> None:
    op.drop_table("events")
    op.drop_table("companies")
    op.drop_table("statuses")
    op.drop_table("users")
