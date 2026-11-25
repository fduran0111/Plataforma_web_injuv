"""Notificaciones dentro de la plataforma: se crean en el mismo commit del evento que las origina."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Iterable

from sqlalchemy.orm import Session

from injuv.db.models import Notificacion


def notificar(
    db: Session,
    usuario_id: int | None,
    tipo: str,
    titulo: str,
    texto: str | None = None,
    enlace: str | None = None,
) -> None:
    """Encola una notificación para un usuario (se confirma con el commit del llamador)."""
    if not usuario_id:
        return
    db.add(
        Notificacion(
            usuario_id=usuario_id,
            tipo=tipo,
            titulo=titulo[:200],
            texto=(texto or "")[:500] or None,
            enlace=(enlace or "")[:300] or None,
            leida=False,
            created_at=datetime.now(),
        )
    )


def notificar_varios(
    db: Session,
    usuario_ids: Iterable[int | None],
    tipo: str,
    titulo: str,
    texto: str | None = None,
    enlace: str | None = None,
) -> None:
    for uid in {u for u in usuario_ids if u}:
        notificar(db, uid, tipo, titulo, texto, enlace)


def serialize(n: Notificacion) -> dict[str, Any]:
    return {
        "id": n.id,
        "tipo": n.tipo,
        "titulo": n.titulo,
        "texto": n.texto,
        "enlace": n.enlace,
        "leida": bool(n.leida),
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }
