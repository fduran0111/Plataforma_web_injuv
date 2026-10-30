"""Sesiones SQLAlchemy para FastAPI (Depends) o uso manual."""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy.orm import Session, sessionmaker

from injuv.db.connection import get_engine

_session_factory: sessionmaker[Session] | None = None


def _factory() -> sessionmaker[Session]:
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(
            bind=get_engine(),
            autoflush=False,
            autocommit=False,
            expire_on_commit=False,
        )
    return _session_factory


def get_db() -> Generator[Session, None, None]:
    """
    Dependencia FastAPI:

        @router.get("/ejemplo")
        def ejemplo(db: Session = Depends(get_db)):
            ...
    """
    db = _factory()()
    try:
        yield db
    finally:
        db.close()
