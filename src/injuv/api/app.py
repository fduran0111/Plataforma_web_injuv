"""Aplicación FastAPI (rutas HTTP). El punto de entrada del servidor está en `main.py` en la raíz."""
from __future__ import annotations

import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from injuv.api import (
    admin_routes,
    auth_routes,
    noticias_routes,
    oportunidades_routes,
    organizaciones_routes,
    portada_routes,
    postulaciones_routes,
    public_routes,
    repositorio_routes,
    usuarios_routes,
)
from injuv.config import load_env
from injuv.db import get_engine, is_database_configured

load_env()

logger = logging.getLogger(__name__)


def _parse_cors_origins(raw: str) -> list[str]:
    """Lista de orígenes separados por coma, sin comillas ni barra final."""
    out: list[str] = []
    for part in raw.strip().strip("\ufeff").split(","):
        origin = part.strip().strip('"').strip("'").rstrip("/")
        if origin:
            out.append(origin)
    return out


app = FastAPI(
    title="INJUV API",
    description="Backend de la plataforma de voluntariado INJUV",
    version="0.1.0",
)

_cors_origins = _parse_cors_origins(
    os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
)
_cors_origin_regex = (
    r"https://.+\.vercel\.app"
    if os.getenv("CORS_ALLOW_VERCEL_APP_REGEX", "1").strip().lower() not in ("0", "false", "no")
    else None
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (
    auth_routes,
    usuarios_routes,
    oportunidades_routes,
    postulaciones_routes,
    organizaciones_routes,
    noticias_routes,
    repositorio_routes,
    admin_routes,
    portada_routes,
    public_routes,
):
    app.include_router(module.router)


@app.get("/health", tags=["Salud"])
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/db/health", tags=["Base de datos"])
def db_health() -> dict[str, object]:
    if not is_database_configured():
        return {"postgresql": "no_configurada"}
    try:
        engine = get_engine()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        url = engine.url
        return {
            "postgresql": "ok",
            "connection": {"host": url.host, "port": url.port, "database": url.database},
        }
    except Exception as exc:
        logger.exception("Fallo al conectar con PostgreSQL")
        return {"postgresql": "error", "detail": type(exc).__name__}
