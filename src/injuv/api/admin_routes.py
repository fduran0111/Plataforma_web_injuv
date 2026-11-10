"""Panel de administración: usuarios, roles, organizaciones, solicitudes, reseñas y estadísticas."""
from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import extract, func, select

from injuv.api.deps import AdminUser, DbSession
from injuv.db.models import (
    AcademiaDocumento,
    BibliotecaDocumento,
    Noticia,
    Oportunidad,
    Organizacion,
    Postulacion,
    SolicitudOrganizacion,
    Usuario,
)
from injuv.services import serializers
from injuv.services.cuentas import eliminar_organizacion, eliminar_usuario

router = APIRouter(prefix="/admin", tags=["Admin"])

MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]


class RolBody(BaseModel):
    rol: Literal["user", "organizacion", "admin"]
    organizacion_id: int | None = None


class RevisionBody(BaseModel):
    estado: Literal["aprobada", "rechazada"]
    comentario: str | None = Field(default=None, max_length=2000)


def resumen_estadisticas(db: DbSession) -> dict[str, int]:
    def count(model, *where) -> int:
        return db.scalar(select(func.count()).select_from(model).where(*where)) or 0

    return {
        "usuarios": count(Usuario),
        "voluntarios": count(Usuario, func.coalesce(Usuario.rol, "user") == "user"),
        "organizaciones": count(Organizacion),
        "oportunidades": count(Oportunidad),
        "oportunidades_abiertas": count(Oportunidad, Oportunidad.estado.in_(("activa", "abierta"))),
        "oportunidades_cerradas": count(Oportunidad, Oportunidad.estado == "cerrada"),
        "postulaciones": count(Postulacion),
        "seleccionados": count(Postulacion, Postulacion.estado == "Seleccionado"),
        "horas_voluntariado": int(db.scalar(select(func.coalesce(func.sum(Postulacion.horas_voluntariado), 0))) or 0),
        "noticias": count(Noticia, Noticia.estado == "activa"),
        "documentos_biblioteca": count(BibliotecaDocumento),
        "documentos_academia": count(AcademiaDocumento),
        "academia_pendientes": count(AcademiaDocumento, AcademiaDocumento.estado == "pendiente"),
        "solicitudes_pendientes": count(SolicitudOrganizacion, SolicitudOrganizacion.estado == "pendiente"),
    }


def _serie_mensual(db: DbSession, column, anio: int) -> list[dict[str, Any]]:
    rows = dict(
        db.execute(
            select(extract("month", column), func.count())
            .where(extract("year", column) == anio)
            .group_by(extract("month", column))
        ).all()
    )
    return [{"label": MESES[m - 1], "cantidad": int(rows.get(m, 0))} for m in range(1, 13)]


@router.get("/estadisticas")
def estadisticas(db: DbSession, _: AdminUser, anio: int | None = None) -> dict[str, Any]:
    anio = anio or datetime.now().year
    area = func.coalesce(func.nullif(Oportunidad.tipo_de_voluntariado, ""), "Sin área")
    por_area = db.execute(select(area, func.count()).group_by(area).order_by(func.count().desc())).all()
    estado_post = func.coalesce(Postulacion.estado, "Sin estado")
    por_estado_post = db.execute(
        select(estado_post, func.count()).group_by(estado_post).order_by(func.count().desc())
    ).all()
    top_orgs = db.execute(
        select(Organizacion.nombre, func.count(Oportunidad.id))
        .join(Oportunidad, Oportunidad.organizacion_id == Organizacion.id)
        .group_by(Organizacion.nombre)
        .order_by(func.count(Oportunidad.id).desc())
        .limit(8)
    ).all()
    return {
        "resumen": resumen_estadisticas(db),
        "anio": anio,
        "usuarios_por_mes": _serie_mensual(db, Usuario.created_at, anio),
        "oportunidades_por_mes": _serie_mensual(db, Oportunidad.created_at, anio),
        "postulaciones_por_mes": _serie_mensual(db, Postulacion.created_at, anio),
        "oportunidades_por_area": [{"label": a, "cantidad": n} for a, n in por_area],
        "postulaciones_por_estado": [{"label": e, "cantidad": n} for e, n in por_estado_post],
        "oportunidades_por_organizacion": [{"label": o or "Sin nombre", "cantidad": n} for o, n in top_orgs],
    }


# ---------- Usuarios ----------


@router.get("/usuarios")
def usuarios(db: DbSession, _: AdminUser) -> list[dict[str, Any]]:
    orgs = {o.id_usuario_org: o for o in db.scalars(select(Organizacion).where(Organizacion.id_usuario_org.is_not(None)))}
    result = []
    for u in db.scalars(select(Usuario).order_by(Usuario.created_at.desc().nullslast(), Usuario.id.desc())):
        data = serializers.usuario(u)
        org = orgs.get(u.id)
        data["organizacion"] = {"id": org.id, "nombre": org.nombre} if org else None
        result.append(data)
    return result


@router.get("/usuarios/exportar")
def exportar_usuarios(db: DbSession, _: AdminUser) -> StreamingResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer, delimiter=";")
    writer.writerow(["ID", "Nombre", "Apellido", "Email", "RUT", "Rol", "Teléfono", "Región", "Comuna", "Horas", "Registro"])
    for u in db.scalars(select(Usuario).order_by(Usuario.id)):
        writer.writerow([
            u.id, u.nombre or "", u.apellido or "", u.email or "", u.rut or "", u.rol or "user",
            u.telefono or "", u.region or "", u.comuna or "", u.hora_voluntariado or 0,
            u.created_at.strftime("%Y-%m-%d") if u.created_at else "",
        ])
    content = "\ufeff" + buffer.getvalue()
    return StreamingResponse(
        iter([content]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="usuarios_{datetime.now():%Y%m%d}.csv"'},
    )


@router.patch("/usuarios/{user_id}/rol")
def cambiar_rol(user_id: int, body: RolBody, db: DbSession, admin: AdminUser) -> dict[str, Any]:
    u = db.get(Usuario, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if u.id == admin.id and body.rol != "admin":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes quitarte el rol de administrador")
    actual = db.scalar(select(Organizacion).where(Organizacion.id_usuario_org == u.id))
    if body.rol == "organizacion":
        if body.organizacion_id:
            org = db.get(Organizacion, body.organizacion_id)
            if not org:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Organización no encontrada")
            if actual and actual.id != org.id:
                actual.id_usuario_org = None
            if org.id_usuario_org and org.id_usuario_org != u.id:
                anterior = db.get(Usuario, org.id_usuario_org)
                if anterior and anterior.rol == "organizacion":
                    anterior.rol = "user"
            org.id_usuario_org = u.id
            u.organizacion_afiliada = None
        elif not actual and not u.organizacion_afiliada:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Asigna una organización al usuario")
    elif body.rol == "user" and actual:
        actual.id_usuario_org = None
    if body.rol != "organizacion":
        u.organizacion_afiliada = None
    u.rol = body.rol
    db.commit()
    org = db.scalar(select(Organizacion).where(Organizacion.id_usuario_org == u.id))
    data = serializers.usuario(u)
    data["organizacion"] = {"id": org.id, "nombre": org.nombre} if org else None
    return data


@router.delete("/usuarios/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_usuario(user_id: int, db: DbSession, admin: AdminUser) -> None:
    u = db.get(Usuario, user_id)
    if not u:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuario no encontrado")
    if u.id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No puedes eliminar tu propia cuenta desde aquí")
    eliminar_usuario(db, u)


# ---------- Organizaciones y oportunidades ----------


@router.get("/organizaciones")
def organizaciones(db: DbSession, _: AdminUser) -> list[dict[str, Any]]:
    counts = (
        select(Oportunidad.organizacion_id, func.count(Oportunidad.id).label("n"))
        .group_by(Oportunidad.organizacion_id)
        .subquery()
    )
    rows = db.execute(
        select(Organizacion, func.coalesce(counts.c.n, 0), Usuario)
        .outerjoin(counts, counts.c.organizacion_id == Organizacion.id)
        .outerjoin(Usuario, Usuario.id == Organizacion.id_usuario_org)
        .order_by(Organizacion.nombre)
    ).all()
    result = []
    for org, n, admin in rows:
        data = serializers.organizacion(org, n)
        data["admin_nombre"] = serializers.nombre_completo(admin) if admin else None
        data["admin_email"] = admin.email if admin else None
        result.append(data)
    return result


@router.delete("/organizaciones/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
def borrar_organizacion(org_id: int, db: DbSession, _: AdminUser) -> None:
    org = db.get(Organizacion, org_id)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organización no encontrada")
    if org.id_usuario_org:
        admin = db.get(Usuario, org.id_usuario_org)
        if admin and admin.rol == "organizacion":
            admin.rol = "user"
    eliminar_organizacion(db, org)
    db.commit()


# ---------- Solicitudes de organización ----------


@router.get("/solicitudes")
def solicitudes(db: DbSession, _: AdminUser, estado: str | None = None) -> list[dict[str, Any]]:
    stmt = select(SolicitudOrganizacion).order_by(SolicitudOrganizacion.created_at.desc())
    if estado:
        stmt = stmt.where(SolicitudOrganizacion.estado == estado)
    result = []
    for s in db.scalars(stmt):
        revisor = db.get(Usuario, s.revisado_por_admin_id) if s.revisado_por_admin_id else None
        result.append(serializers.solicitud(s, db.get(Usuario, s.id_usuario_org), revisor))
    return result


@router.patch("/solicitudes/{solicitud_id}")
def revisar_solicitud(solicitud_id: int, body: RevisionBody, db: DbSession, admin: AdminUser) -> dict[str, Any]:
    s = db.get(SolicitudOrganizacion, solicitud_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Solicitud no encontrada")
    if s.estado != "pendiente":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"La solicitud ya fue {s.estado}")
    solicitante = db.get(Usuario, s.id_usuario_org)
    if not solicitante:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "El usuario solicitante ya no existe")
    if body.estado == "aprobada":
        if s.rut and db.scalar(select(Organizacion.id).where(Organizacion.rut == s.rut)):
            raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una organización con ese RUT")
        if db.scalar(select(Organizacion.id).where(Organizacion.id_usuario_org == solicitante.id)):
            raise HTTPException(status.HTTP_409_CONFLICT, "El usuario ya administra una organización")
        db.add(
            Organizacion(
                nombre=s.nombre,
                rut=s.rut,
                email_contacto=s.email_contacto or solicitante.email,
                fecha_creacion=s.fecha_creacion,
                region=s.region,
                ciudad=s.ciudad,
                comuna=s.comuna,
                descripcion=s.descripcion,
                sitio_web=s.sitio_web,
                redes_sociales=s.redes_sociales or [],
                certificacion=[],
                documentos_legales=[],
                id_usuario_org=solicitante.id,
                created_at=datetime.now(),
            )
        )
        if solicitante.rol != "admin":
            solicitante.rol = "organizacion"
    s.estado = body.estado
    s.comentario_revision = body.comentario
    s.revisado_por_admin_id = admin.id
    s.reviewed_at = datetime.now()
    db.commit()
    return serializers.solicitud(s, solicitante, admin)


# ---------- Reseñas ----------


@router.get("/resenas")
def resenas(db: DbSession, _: AdminUser) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Postulacion, Oportunidad.titulo, Organizacion.nombre, Usuario)
        .join(Oportunidad, Oportunidad.id == Postulacion.oportunidad_id)
        .outerjoin(Organizacion, Organizacion.id == Oportunidad.organizacion_id)
        .outerjoin(Usuario, Usuario.id == Postulacion.usuario_id)
        .where((Postulacion.resena_usuario.is_not(None)) | (Postulacion.resena_org_sobre_voluntario.is_not(None)))
        .order_by(Postulacion.updated_at.desc().nullslast())
    ).all()
    return [
        {
            **serializers.postulacion_base(p),
            "oportunidad_titulo": titulo,
            "organizacion_nombre": org or "",
            "usuario_nombre": serializers.nombre_completo(u),
        }
        for p, titulo, org, u in rows
    ]
