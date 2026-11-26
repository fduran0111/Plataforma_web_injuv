"""Datos públicos de la página de inicio."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from injuv.api.deps import DbSession
from injuv.db.models import Oportunidad, Organizacion, PortadaConfig, Postulacion, Usuario
from injuv.services import resenas as resenas_svc

router = APIRouter(prefix="/public", tags=["Público"])


@router.get("/estadisticas")
def estadisticas(db: DbSession) -> dict[str, int]:
    return {
        "voluntarios": db.scalar(select(func.count()).select_from(Usuario).where(func.coalesce(Usuario.rol, "user") == "user")) or 0,
        "organizaciones": db.scalar(select(func.count()).select_from(Organizacion)) or 0,
        "oportunidades": db.scalar(select(func.count()).select_from(Oportunidad)) or 0,
        "horas": int(db.scalar(select(func.coalesce(func.sum(Postulacion.horas_voluntariado), 0))) or 0),
    }


@router.get("/resenas")
def resenas(db: DbSession, limite: int = Query(6, ge=1, le=30)) -> list[dict[str, Any]]:
    cfg = db.get(PortadaConfig, 1)
    ids = list(cfg.resenas_ids or []) if cfg else []
    if not ids:
        return []
    rows = db.execute(resenas_svc.consulta_publicas().where(Postulacion.id.in_(ids))).all()
    posicion = {pid: i for i, pid in enumerate(ids)}
    rows.sort(key=lambda r: posicion.get(r[0].id, len(ids)))
    return [resenas_svc.a_dict(row) for row in rows[:limite]]
