from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.config import settings

is_sqlite = settings.DATABASE_URL.startswith("sqlite")

if is_sqlite:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
    @event.listens_for(engine, "connect")
    def enable_fk(dbapi_conn, _):
        dbapi_conn.execute("PRAGMA foreign_keys=ON")
else:
    # PostgreSQL（本番）: 接続プール設定
    engine = create_engine(
        settings.DATABASE_URL,
        pool_size=5,
        max_overflow=10,
        pool_pre_ping=True,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
