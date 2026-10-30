"""Datos públicos de la página de inicio."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query
from sqlalchemy import func, select

from injuv.api.deps import DbSession
from injuv.db.models import Oportunidad, Organizacion, Postulacion, Usuario
from injuv.services import serializers

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
    rows = db.execute(
        select(Postulacion, Usuario, Oportunidad.titulo, Organizacion.id, Organizacion.nombre)
        .join(Usuario, Usuario.id == Postulacion.usuario_id)
        .join(Oportunidad, Oportunidad.id == Postulacion.oportunidad_id)
        .join(Organizacion, Organizacion.id == Oportunidad.organizacion_id)
        .where(
            Postulacion.resena_usuario.is_not(None),
            Postulacion.resena_usuario != "",
            Postulacion.resena_usuario_publica.is_not(False),
        )
        .order_by(Postulacion.updated_at.desc().nullslast())
        .limit(limite)
    ).all()
    return [
        {
            "postulacion_id": p.id,
            "usuario_nombre": serializers.nombre_completo(u),
            "usuario_tiene_foto": bool(u.foto_perfil),
            "usuario_id": u.id,
            "oportunidad_titulo": titulo,
            "organizacion_id": org_id,
            "organizacion_nombre": org_nombre or "",
            "resena": p.resena_usuario,
            "calificacion": float(p.calificacion_usuario_org) if p.calificacion_usuario_org is not None else None,
            "fecha": p.updated_at or p.created_at,
        }
        for p, u, titulo, org_id, org_nombre in rows
    ]
