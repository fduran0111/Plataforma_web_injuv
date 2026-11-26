"""Reseñas públicas de voluntarios para la portada."""
from __future__ import annotations

from typing import Any

from sqlalchemy import select

from injuv.db.models import Oportunidad, Organizacion, Postulacion, Usuario
from injuv.services import serializers


def consulta_publicas():
    """Reseñas públicas elegibles, de la más reciente a la más antigua."""
    return (
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
    )


def a_dict(row: tuple) -> dict[str, Any]:
    p, u, titulo, org_id, org_nombre = row
    return {
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
