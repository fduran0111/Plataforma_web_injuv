"""Foros por voluntariado: anuncios del tutor y chat con los voluntarios seleccionados."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select

from injuv.api.deps import CurrentUser, DbSession
from injuv.api.oportunidades_routes import get_oportunidad_or_404
from injuv.db.models import ForoMensaje, Oportunidad, Organizacion, Postulacion, Usuario
from injuv.security.rbac import is_admin
from injuv.services.catalogo import rechazo_participacion

router = APIRouter(tags=["Foros"])

Canal = Literal["anuncios", "chat"]


class MensajeBody(BaseModel):
    canal: Canal = "chat"
    texto: str = Field(min_length=1, max_length=2000)


def _es_staff(op: Oportunidad, org: Organizacion | None, user: Usuario) -> bool:
    """Admin INJUV, administrador de la organización o tutor (integrante encargado) del voluntariado."""
    if is_admin(user.rol) or (org and org.id_usuario_org == user.id):
        return True
    return bool(org and user.organizacion_afiliada == org.id and user.id in (op.encargados_ids or []))


def _participa(db: DbSession, op: Oportunidad, user: Usuario) -> bool:
    p = db.scalar(select(Postulacion).where(Postulacion.oportunidad_id == op.id, Postulacion.usuario_id == user.id))
    return bool(p and p.estado == "Seleccionado" and not rechazo_participacion(p))


def _acceso(db: DbSession, op: Oportunidad, user: Usuario) -> tuple[Organizacion | None, bool]:
    org = db.get(Organizacion, op.organizacion_id)
    staff = _es_staff(op, org, user)
    if not staff and not _participa(db, op, user):
        raise HTTPException(status.HTTP_403_FORBIDDEN, "No participas en este voluntariado")
    return org, staff


def _mensaje(m: ForoMensaje, autor: Usuario | None, op: Oportunidad, org: Organizacion | None) -> dict[str, Any]:
    return {
        "id": m.id,
        "canal": m.canal,
        "autor_id": m.autor_id,
        "autor_nombre": " ".join(x for x in ((autor.nombre or "").strip(), (autor.apellido or "").strip()) if x)
        if autor
        else "Cuenta eliminada",
        "es_tutor": bool(autor and _es_staff(op, org, autor)),
        "texto": m.texto,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


@router.get("/foros")
def mis_foros(db: DbSession, user: CurrentUser) -> list[dict[str, Any]]:
    """Voluntariados con foro para el usuario: los que tutorea/administra o en los que fue seleccionado."""
    ops: dict[int, Oportunidad] = {}
    org_propia = db.scalar(select(Organizacion).where(Organizacion.id_usuario_org == user.id))
    if org_propia:
        ops |= {o.id: o for o in db.scalars(select(Oportunidad).where(Oportunidad.organizacion_id == org_propia.id))}
    if user.organizacion_afiliada:
        ops |= {
            o.id: o
            for o in db.scalars(
                select(Oportunidad).where(
                    Oportunidad.organizacion_id == user.organizacion_afiliada,
                    Oportunidad.encargados_ids.contains([user.id]),
                )
            )
        }
    for p, o in db.execute(
        select(Postulacion, Oportunidad)
        .join(Oportunidad, Oportunidad.id == Postulacion.oportunidad_id)
        .where(Postulacion.usuario_id == user.id, Postulacion.estado == "Seleccionado")
    ).all():
        if not rechazo_participacion(p):
            ops[o.id] = o
    resultado = []
    for o in ops.values():
        org = db.get(Organizacion, o.organizacion_id)
        ultimo = db.scalar(
            select(ForoMensaje).where(ForoMensaje.oportunidad_id == o.id).order_by(ForoMensaje.created_at.desc()).limit(1)
        )
        resultado.append(
            {
                "oportunidad_id": o.id,
                "titulo": o.titulo or "",
                "organizacion_nombre": (org.nombre if org else "") or "",
                "es_tutor": _es_staff(o, org, user),
                "ultimo_mensaje": ultimo.texto if ultimo else None,
                "ultima_fecha": ultimo.created_at.isoformat() if ultimo and ultimo.created_at else None,
            }
        )
    resultado.sort(key=lambda f: f["ultima_fecha"] or "", reverse=True)
    return resultado


@router.get("/oportunidades/{oportunidad_id}/foro")
def listar_mensajes(oportunidad_id: int, db: DbSession, user: CurrentUser, canal: Canal = "chat") -> list[dict[str, Any]]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    org, _ = _acceso(db, op, user)
    rows = db.execute(
        select(ForoMensaje, Usuario)
        .outerjoin(Usuario, Usuario.id == ForoMensaje.autor_id)
        .where(ForoMensaje.oportunidad_id == op.id, ForoMensaje.canal == canal)
        .order_by(ForoMensaje.created_at.desc(), ForoMensaje.id.desc())
        .limit(300)
    ).all()
    return [_mensaje(m, autor, op, org) for m, autor in reversed(rows)]


@router.post("/oportunidades/{oportunidad_id}/foro", status_code=status.HTTP_201_CREATED)
def publicar(oportunidad_id: int, body: MensajeBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    org, staff = _acceso(db, op, user)
    if body.canal == "anuncios" and not staff:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo los tutores pueden publicar anuncios")
    m = ForoMensaje(oportunidad_id=op.id, canal=body.canal, autor_id=user.id, texto=body.texto.strip(), created_at=datetime.now())
    db.add(m)
    db.commit()
    return _mensaje(m, user, op, org)
