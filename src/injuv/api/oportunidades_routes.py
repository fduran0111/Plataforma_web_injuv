"""Oportunidades de voluntariado: listado público, gestión por organizaciones y postulación."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlalchemy import func, or_, select

from injuv.api.deps import CurrentUser, DbSession, OptionalUser, OwnOrganization
from injuv.db.models import Oportunidad, Organizacion, Postulacion, Usuario
from injuv.schemas.oportunidades import CorreoMasivoBody, EstadoOportunidadBody, OportunidadBody
from injuv.security.rbac import is_admin, normalize_role
from injuv.services import mailer, serializers
from injuv.services.catalogo import ESTADOS_OPORTUNIDAD_ABIERTOS

router = APIRouter(prefix="/oportunidades", tags=["Oportunidades"])

_FIELD_MAP = {"region": "region_opor", "ciudad": "ciudad_opor", "comuna": "comuna_opor"}


def _count_subquery():
    return (
        select(Postulacion.oportunidad_id, func.count(Postulacion.id).label("n"))
        .group_by(Postulacion.oportunidad_id)
        .subquery()
    )


def get_oportunidad_or_404(db: DbSession, oportunidad_id: int) -> Oportunidad:
    op = db.get(Oportunidad, oportunidad_id)
    if not op:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Oportunidad no encontrada")
    return op


def ensure_can_manage(db: DbSession, op: Oportunidad, user: Usuario) -> Organizacion | None:
    """Admin o la organización dueña de la oportunidad."""
    org = db.get(Organizacion, op.organizacion_id)
    if is_admin(user.rol) or (org and org.id_usuario_org == user.id):
        return org
    raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permisos sobre esta oportunidad")


def _serialize(db: DbSession, op: Oportunidad) -> dict[str, Any]:
    org = db.get(Organizacion, op.organizacion_id)
    n = db.scalar(select(func.count(Postulacion.id)).where(Postulacion.oportunidad_id == op.id)) or 0
    return serializers.oportunidad(op, org, n)


def _apply_body(op: Oportunidad, body: OportunidadBody) -> None:
    for field, value in body.model_dump().items():
        setattr(op, _FIELD_MAP.get(field, field), value)


@router.get("")
def listar(
    db: DbSession,
    estado: str | None = Query(None, description="activa | abierta | cerrada | todas"),
    region: str | None = None,
    area: str | None = None,
    q: str | None = None,
    organizacion_id: int | None = None,
    limit: int = Query(200, ge=1, le=500),
) -> list[dict[str, Any]]:
    counts = _count_subquery()
    stmt = (
        select(Oportunidad, Organizacion, func.coalesce(counts.c.n, 0))
        .outerjoin(Organizacion, Organizacion.id == Oportunidad.organizacion_id)
        .outerjoin(counts, counts.c.oportunidad_id == Oportunidad.id)
        .order_by(Oportunidad.created_at.desc().nullslast(), Oportunidad.id.desc())
        .limit(limit)
    )
    if estado and estado != "todas":
        stmt = stmt.where(Oportunidad.estado == estado)
    elif not estado:
        stmt = stmt.where(Oportunidad.estado.in_(ESTADOS_OPORTUNIDAD_ABIERTOS))
    if region:
        stmt = stmt.where(or_(Oportunidad.region_opor.ilike(f"%{region}%"), Organizacion.region.ilike(f"%{region}%")))
    if area:
        stmt = stmt.where(Oportunidad.tipo_de_voluntariado.ilike(f"%{area}%"))
    if q:
        stmt = stmt.where(or_(Oportunidad.titulo.ilike(f"%{q}%"), Oportunidad.descripcion.ilike(f"%{q}%")))
    if organizacion_id:
        stmt = stmt.where(Oportunidad.organizacion_id == organizacion_id)
    return [serializers.oportunidad(op, org, n) for op, org, n in db.execute(stmt).all()]


@router.get("/mias")
def listar_de_mi_organizacion(db: DbSession, org: OwnOrganization) -> list[dict[str, Any]]:
    return listar(db, estado="todas", organizacion_id=org.id, limit=500)


@router.get("/{oportunidad_id}")
def obtener(oportunidad_id: int, db: DbSession, user: OptionalUser) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    data = _serialize(db, op)
    data["mi_postulacion"] = None
    if user:
        p = db.scalar(
            select(Postulacion).where(Postulacion.oportunidad_id == op.id, Postulacion.usuario_id == user.id)
        )
        if p:
            data["mi_postulacion"] = {"id": p.id, "estado": p.estado}
    return data


@router.post("", status_code=status.HTTP_201_CREATED)
def crear(body: OportunidadBody, db: DbSession, org: OwnOrganization) -> dict[str, Any]:
    op = Oportunidad(organizacion_id=org.id, estado="activa", created_at=datetime.now())
    _apply_body(op, body)
    db.add(op)
    db.commit()
    db.refresh(op)
    return _serialize(db, op)


@router.put("/{oportunidad_id}")
def actualizar(oportunidad_id: int, body: OportunidadBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user)
    _apply_body(op, body)
    db.commit()
    return _serialize(db, op)


@router.patch("/{oportunidad_id}/estado")
def cambiar_estado(
    oportunidad_id: int,
    body: EstadoOportunidadBody,
    db: DbSession,
    user: CurrentUser,
    background: BackgroundTasks,
) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user)
    anterior, op.estado = op.estado, body.estado
    db.commit()
    if body.estado == "cerrada" and anterior != "cerrada":
        rows = db.execute(
            select(Usuario.email, Usuario.nombre)
            .join(Postulacion, Postulacion.usuario_id == Usuario.id)
            .where(Postulacion.oportunidad_id == op.id, Postulacion.estado != "No seleccionado")
        ).all()
        for email, nombre in rows:
            background.add_task(mailer.notify_oportunidad_cerrada, email, nombre or "", op.titulo)
    return _serialize(db, op)


@router.delete("/{oportunidad_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(oportunidad_id: int, db: DbSession, user: CurrentUser) -> None:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user)
    for p in db.scalars(select(Postulacion).where(Postulacion.oportunidad_id == op.id)):
        db.delete(p)
    db.delete(op)
    db.commit()


@router.get("/{oportunidad_id}/postulaciones")
def postulantes(oportunidad_id: int, db: DbSession, user: CurrentUser, estado: str | None = None) -> list[dict[str, Any]]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    ensure_can_manage(db, op, user)
    stmt = (
        select(Postulacion, Usuario)
        .outerjoin(Usuario, Usuario.id == Postulacion.usuario_id)
        .where(Postulacion.oportunidad_id == op.id)
        .order_by(Postulacion.created_at.desc().nullslast())
    )
    if estado:
        stmt = stmt.where(Postulacion.estado == estado)
    return [serializers.postulacion_para_org(p, u) for p, u in db.execute(stmt).all()]


@router.post("/{oportunidad_id}/postular", status_code=status.HTTP_201_CREATED)
def postular(oportunidad_id: int, db: DbSession, user: CurrentUser, background: BackgroundTasks) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    if normalize_role(user.rol) != "user":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Solo las cuentas de voluntario pueden postular")
    if op.estado not in ESTADOS_OPORTUNIDAD_ABIERTOS:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La oportunidad no está recibiendo postulaciones")
    if op.fecha_limite_postulacion and op.fecha_limite_postulacion < date.today():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La fecha límite de postulación ya pasó")
    if db.scalar(select(Postulacion.id).where(Postulacion.oportunidad_id == op.id, Postulacion.usuario_id == user.id)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya postulaste a esta oportunidad")
    total = db.scalar(select(func.count(Postulacion.id)).where(Postulacion.oportunidad_id == op.id)) or 0
    if op.meta_postulantes and total >= op.meta_postulantes:
        op.estado = "cerrada"
        db.commit()
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Se alcanzó el límite de postulaciones")
    now = datetime.now()
    p = Postulacion(
        usuario_id=user.id,
        oportunidad_id=op.id,
        estado="Pendiente de revisión",
        estado_confirmacion="Pendiente",
        asistencia_capacitacion="No aplica",
        asistencia_actividad="No aplica",
        tiene_certificado=False,
        resena_org_publica=False,
        horas_voluntariado=0,
        created_at=now,
        updated_at=now,
    )
    db.add(p)
    db.commit()
    org = db.get(Organizacion, op.organizacion_id)
    background.add_task(
        mailer.notify_postulacion_creada, user.email, user.nombre or "", op.titulo, (org.nombre if org else "") or ""
    )
    return {"id": p.id, "estado": p.estado}


@router.post("/{oportunidad_id}/correo-masivo")
def correo_masivo(oportunidad_id: int, body: CorreoMasivoBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    op = get_oportunidad_or_404(db, oportunidad_id)
    org = ensure_can_manage(db, op, user)
    if not mailer.is_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "El correo saliente no está configurado en el servidor")
    stmt = (
        select(Usuario.email, Usuario.nombre)
        .join(Postulacion, Postulacion.usuario_id == Usuario.id)
        .where(Postulacion.oportunidad_id == op.id)
    )
    if body.filtro_estado != "todos":
        stmt = stmt.where(Postulacion.estado == body.filtro_estado)
    destinatarios = db.execute(stmt).all()
    if not destinatarios:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No hay postulantes para ese filtro")
    org_nombre = (org.nombre if org else "") or "INJUV"
    enviados = sum(
        mailer.send_mensaje_masivo(email, nombre or "", body.asunto, body.mensaje, op.titulo, org_nombre)
        for email, nombre in destinatarios
    )
    return {"enviados": enviados, "total": len(destinatarios)}
