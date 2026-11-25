"""Campana de notificaciones: listado, contador de no leídas y marcar como leídas."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select, update

from injuv.api.deps import CurrentUser, DbSession
from injuv.db.models import Notificacion
from injuv.services import notificaciones as notif

router = APIRouter(prefix="/notificaciones", tags=["Notificaciones"])


@router.get("")
def listar(db: DbSession, user: CurrentUser, limite: int = 30) -> dict[str, Any]:
    limite = min(max(limite, 1), 100)
    items = db.scalars(
        select(Notificacion)
        .where(Notificacion.usuario_id == user.id)
        .order_by(Notificacion.created_at.desc(), Notificacion.id.desc())
        .limit(limite)
    ).all()
    no_leidas = db.scalar(
        select(func.count(Notificacion.id)).where(Notificacion.usuario_id == user.id, Notificacion.leida.is_(False))
    ) or 0
    return {"items": [notif.serialize(n) for n in items], "no_leidas": no_leidas}


@router.get("/contador")
def contador(db: DbSession, user: CurrentUser) -> dict[str, int]:
    """Ligero, para el badge de la campana (polling)."""
    n = db.scalar(
        select(func.count(Notificacion.id)).where(Notificacion.usuario_id == user.id, Notificacion.leida.is_(False))
    ) or 0
    return {"no_leidas": n}


@router.post("/{notificacion_id}/leer")
def leer(notificacion_id: int, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    n = db.get(Notificacion, notificacion_id)
    if not n or n.usuario_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notificación no encontrada")
    n.leida = True
    db.commit()
    return notif.serialize(n)


@router.post("/leer-todas")
def leer_todas(db: DbSession, user: CurrentUser) -> dict[str, int]:
    res = db.execute(
        update(Notificacion)
        .where(Notificacion.usuario_id == user.id, Notificacion.leida.is_(False))
        .values(leida=True)
    )
    db.commit()
    return {"leidas": res.rowcount}
