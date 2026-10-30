"""
Configuración de PostgreSQL solo desde el entorno.
Nunca guardes contraseñas en código: cada quien usa su .env local (gitignored).
"""
from __future__ import annotations

import os
from urllib.parse import quote_plus

from injuv.config import load_env


def _database_url_for_sqlalchemy(url: str) -> str:
    """Normaliza `postgres://` / `postgresql://` al driver psycopg3."""
    u = url.strip()
    if u.startswith("postgresql+"):
        return u
    for prefix in ("postgres://", "postgresql://"):
        if u.startswith(prefix):
            return "postgresql+psycopg://" + u[len(prefix):]
    return u


def build_database_url() -> str | None:
    """
    URL SQLAlchemy para psycopg3, o None si no hay configuración.

    Prioridad:
    1. DATABASE_URL
    2. POSTGRES_HOST + POSTGRES_USER + POSTGRES_PASSWORD + POSTGRES_DB (+ POSTGRES_PORT)
    """
    load_env()

    direct = (os.getenv("DATABASE_URL") or "").strip()
    if direct:
        return _database_url_for_sqlalchemy(direct)

    host = (os.getenv("POSTGRES_HOST") or "").strip()
    database = (os.getenv("POSTGRES_DB") or "").strip()
    if not host or not database:
        return None

    port = (os.getenv("POSTGRES_PORT") or "5432").strip()
    user = quote_plus((os.getenv("POSTGRES_USER") or "postgres").strip())
    password = os.getenv("POSTGRES_PASSWORD") or ""
    auth = f"{user}:{quote_plus(password)}@" if password else f"{user}@"
    return f"postgresql+psycopg://{auth}{host}:{port}/{quote_plus(database)}"
