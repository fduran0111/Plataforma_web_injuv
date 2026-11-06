"""Organizaciones: directorio público, gestión de la propia organización y solicitudes de alta."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import and_, func, or_, select

from injuv.api.deps import CurrentUser, DbSession, OwnOrganization
from injuv.db.models import Oportunidad, Organizacion, Postulacion, SolicitudOrganizacion, Usuario
from injuv.schemas.perfiles import OrganizacionBody, SolicitudOrganizacionBody
from injuv.services import files, serializers
from injuv.services.catalogo import limpiar_rut

router = APIRouter(prefix="/organizaciones", tags=["Organizaciones"])

LOGO_FOLDER = "logos_organizaciones"
CERT_FOLDER = "certificaciones_organizaciones"


def _get_org(db: DbSession, org_id: int) -> Organizacion:
    org = db.get(Organizacion, org_id)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Organización no encontrada")
    return org


def _detalle(db: DbSession, org: Organizacion) -> dict[str, Any]:
    n = db.scalar(select(func.count(Oportunidad.id)).where(Oportunidad.organizacion_id == org.id)) or 0
    data = serializers.organizacion(org, n)
    stats = db.execute(
        select(func.count(Postulacion.id), func.avg(Postulacion.calificacion_usuario_org))
        .join(Oportunidad, Oportunidad.id == Postulacion.oportunidad_id)
        .where(Oportunidad.organizacion_id == org.id)
    ).one()
    data["total_postulaciones"] = stats[0] or 0
    data["calificacion_promedio"] = round(float(stats[1]), 1) if stats[1] is not None else None
    data["certificacion"] = [
        {"nombre": c.get("nombre") or c.get("archivo"), "archivo": c.get("archivo"), "subido_en": c.get("subido_en")}
        for c in data["certificacion"]
        if isinstance(c, dict) and c.get("archivo")
    ]
    return data


def _resenas(db: DbSession, org_id: int, solo_publicas: bool) -> list[dict[str, Any]]:
    stmt = (
        select(Postulacion, Oportunidad.titulo, Usuario)
        .join(Oportunidad, Oportunidad.id == Postulacion.oportunidad_id)
        .outerjoin(Usuario, Usuario.id == Postulacion.usuario_id)
        .where(
            Oportunidad.organizacion_id == org_id,
            or_(
                and_(Postulacion.resena_usuario.is_not(None), Postulacion.resena_usuario != ""),
                Postulacion.calificacion_usuario_org.is_not(None),
            ),
        )
        .order_by(Postulacion.updated_at.desc().nullslast())
    )
    if solo_publicas:
        stmt = stmt.where(Postulacion.resena_usuario_publica.is_not(False))
    return [
        {
            "postulacion_id": p.id,
            "oportunidad_id": p.oportunidad_id,
            "oportunidad_titulo": titulo,
            "usuario_nombre": serializers.nombre_completo(u),
            "resena": p.resena_usuario or "",
            "calificacion": float(p.calificacion_usuario_org) if p.calificacion_usuario_org is not None else None,
            "es_publica": p.resena_usuario_publica is not False,
            "fecha": p.updated_at or p.created_at,
        }
        for p, titulo, u in db.execute(stmt).all()
    ]


# ---------- Público ----------


@router.get("")
def listar(db: DbSession, q: str | None = None, region: str | None = None) -> list[dict[str, Any]]:
    counts = (
        select(Oportunidad.organizacion_id, func.count(Oportunidad.id).label("n"))
        .group_by(Oportunidad.organizacion_id)
        .subquery()
    )
    stmt = (
        select(Organizacion, func.coalesce(counts.c.n, 0))
        .outerjoin(counts, counts.c.organizacion_id == Organizacion.id)
        .order_by(Organizacion.nombre)
    )
    if q:
        stmt = stmt.where(or_(Organizacion.nombre.ilike(f"%{q}%"), Organizacion.area_trabajo.ilike(f"%{q}%")))
    if region:
        stmt = stmt.where(Organizacion.region.ilike(f"%{region}%"))
    return [serializers.organizacion(o, n) for o, n in db.execute(stmt).all()]


@router.get("/mia")
def mi_organizacion(db: DbSession, org: OwnOrganization) -> dict[str, Any]:
    return _detalle(db, org)


@router.get("/solicitudes/mia")
def mi_solicitud(db: DbSession, user: CurrentUser) -> list[dict[str, Any]]:
    solicitudes = db.scalars(
        select(SolicitudOrganizacion)
        .where(SolicitudOrganizacion.id_usuario_org == user.id)
        .order_by(SolicitudOrganizacion.created_at.desc())
    )
    return [serializers.solicitud(s, user, None) for s in solicitudes]


@router.get("/mia/resenas")
def mis_resenas(db: DbSession, org: OwnOrganization) -> list[dict[str, Any]]:
    return _resenas(db, org.id, solo_publicas=False)


@router.get("/{org_id}")
def detalle(org_id: int, db: DbSession) -> dict[str, Any]:
    data = _detalle(db, _get_org(db, org_id))
    for key in ("rut", "id_usuario_org"):
        data.pop(key, None)
    return data


@router.get("/{org_id}/logo")
def logo(org_id: int, db: DbSession) -> FileResponse:
    org = db.get(Organizacion, org_id)
    return files.send(LOGO_FOLDER, org.logo_filename if org else None)


@router.get("/{org_id}/resenas")
def resenas_publicas(org_id: int, db: DbSession) -> list[dict[str, Any]]:
    _get_org(db, org_id)
    return _resenas(db, org_id, solo_publicas=True)


@router.get("/{org_id}/certificaciones/{archivo}")
def descargar_certificacion(org_id: int, archivo: str, db: DbSession) -> FileResponse:
    org = _get_org(db, org_id)
    cert = next((c for c in (org.certificacion or []) if isinstance(c, dict) and c.get("archivo") == archivo), None)
    if not cert:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Certificación no encontrada")
    return files.send(CERT_FOLDER, archivo, cert.get("nombre") or archivo)


# ---------- Organización propia ----------


@router.put("/mia")
def actualizar(body: OrganizacionBody, db: DbSession, org: OwnOrganization) -> dict[str, Any]:
    if body.email_contacto:
        otra = db.scalar(
            select(Organizacion.id).where(Organizacion.email_contacto == body.email_contacto, Organizacion.id != org.id)
        )
        if otra:
            raise HTTPException(status.HTTP_409_CONFLICT, "Ese correo ya lo usa otra organización")
    for field, value in body.model_dump().items():
        setattr(org, field, value)
    db.commit()
    return _detalle(db, org)


@router.post("/mia/logo")
async def subir_logo(db: DbSession, org: OwnOrganization, imagen: UploadFile = File(...)) -> dict[str, Any]:
    name, _, _ = await files.save_upload(imagen, LOGO_FOLDER, f"org_{org.id}", files.IMAGE_EXTS, 5)
    files.delete(LOGO_FOLDER, org.logo_filename)
    org.logo_filename = name
    db.commit()
    return _detalle(db, org)


@router.post("/mia/certificaciones")
async def subir_certificacion(
    db: DbSession,
    org: OwnOrganization,
    nombre: str = Form(..., min_length=2, max_length=150),
    archivo: UploadFile = File(...),
) -> dict[str, Any]:
    name, _, _ = await files.save_upload(archivo, CERT_FOLDER, f"cert_org_{org.id}", {".pdf", ".jpg", ".jpeg", ".png"}, 10)
    actuales = [c for c in (org.certificacion or []) if isinstance(c, dict)]
    org.certificacion = actuales + [
        {"nombre": nombre.strip(), "archivo": name, "subido_en": datetime.now().isoformat(timespec="seconds")}
    ]
    db.commit()
    return _detalle(db, org)


@router.delete("/mia/certificaciones/{archivo}")
def eliminar_certificacion(archivo: str, db: DbSession, org: OwnOrganization) -> dict[str, Any]:
    files.delete(CERT_FOLDER, archivo)
    org.certificacion = [c for c in (org.certificacion or []) if not (isinstance(c, dict) and c.get("archivo") == archivo)]
    db.commit()
    return _detalle(db, org)


# ---------- Solicitudes de alta ----------


@router.post("/solicitudes", status_code=status.HTTP_201_CREATED)
def crear_solicitud(body: SolicitudOrganizacionBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    if db.scalar(select(Organizacion.id).where(Organizacion.id_usuario_org == user.id)):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ya administras una organización")
    pendiente = db.scalar(
        select(SolicitudOrganizacion.id).where(
            SolicitudOrganizacion.id_usuario_org == user.id, SolicitudOrganizacion.estado == "pendiente"
        )
    )
    if pendiente:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ya tienes una solicitud pendiente de revisión")
    rut = limpiar_rut(body.rut)
    if rut and (
        db.scalar(select(Organizacion.id).where(Organizacion.rut == rut))
        or db.scalar(
            select(SolicitudOrganizacion.id).where(
                SolicitudOrganizacion.rut == rut, SolicitudOrganizacion.estado.in_(("pendiente", "aprobada"))
            )
        )
    ):
        raise HTTPException(status.HTTP_409_CONFLICT, "Ya existe una organización o solicitud con ese RUT")
    now = datetime.now()
    s = SolicitudOrganizacion(
        nombre=body.nombre.strip(),
        rut=rut,
        email_contacto=user.email,
        fecha_creacion=body.fecha_creacion,
        region=body.region,
        ciudad=body.ciudad,
        comuna=body.comuna,
        descripcion=body.descripcion.strip(),
        sitio_web=str(body.sitio_web) if body.sitio_web else None,
        redes_sociales=[r.strip() for r in body.redes_sociales if r.strip()],
        id_usuario_org=user.id,
        estado="pendiente",
        created_at=now,
        updated_at=now,
    )
    db.add(s)
    db.commit()
    return serializers.solicitud(s, user, None)
