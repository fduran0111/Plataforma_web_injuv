"""Ciclo de vida de una postulación: acciones del voluntario y de la organización."""
from __future__ import annotations

from datetime import datetime
from html import escape
from typing import Any

from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from injuv.api.deps import CurrentUser, DbSession
from injuv.api.oportunidades_routes import ensure_can_manage
from injuv.db.models import Oportunidad, Organizacion, Postulacion, Usuario
from injuv.schemas.postulaciones import (
    AsistenciaBody,
    ConfirmacionBody,
    EnviarCertificadoBody,
    EstadoPostulacionBody,
    ResenaOrgBody,
    ResenaUsuarioBody,
    VisibilidadBody,
)
from injuv.security.rbac import is_admin
from injuv.services import files, mailer, serializers
from injuv.services.catalogo import ESTADO_DECLINADA, rechazo_participacion, voluntariado_terminado

router = APIRouter(prefix="/postulaciones", tags=["Postulaciones"])

CERT_FOLDER = "certificados_voluntarios"


def _get(db: DbSession, postulacion_id: int) -> tuple[Postulacion, Oportunidad]:
    p = db.get(Postulacion, postulacion_id)
    op = db.get(Oportunidad, p.oportunidad_id) if p else None
    if not p or not op:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Postulación no encontrada")
    return p, op


def _own(db: DbSession, postulacion_id: int, user: Usuario) -> tuple[Postulacion, Oportunidad]:
    p, op = _get(db, postulacion_id)
    if p.usuario_id != user.id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Esta postulación no es tuya")
    return p, op


def _managed(db: DbSession, postulacion_id: int, user: Usuario) -> tuple[Postulacion, Oportunidad, Organizacion | None]:
    p, op = _get(db, postulacion_id)
    return p, op, ensure_can_manage(db, op, user)


def _touch_and_return(db: DbSession, p: Postulacion) -> dict[str, Any]:
    p.updated_at = datetime.now()
    db.commit()
    return serializers.postulacion_con_ciclo(p, db.get(Oportunidad, p.oportunidad_id))


def _exigir_fin_de_ciclo(p: Postulacion, op: Oportunidad, accion: str) -> None:
    """Certificado y evaluaciones solo con el voluntariado terminado y un seleccionado que participa."""
    if p.estado != "Seleccionado" or rechazo_participacion(p):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Solo se puede {accion} de postulantes seleccionados que participaron")
    if not voluntariado_terminado(op):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Podrás {accion} cuando termine el voluntariado")


# ---------- Voluntario ----------


@router.put("/{postulacion_id}/declinar")
def declinar(postulacion_id: int, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    p, _ = _own(db, postulacion_id, user)
    p.estado = ESTADO_DECLINADA
    return _touch_and_return(db, p)


@router.put("/{postulacion_id}/confirmacion")
def confirmar_participacion(postulacion_id: int, body: ConfirmacionBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    p, _ = _own(db, postulacion_id, user)
    if p.estado != "Seleccionado":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Solo puedes confirmar si fuiste seleccionado")
    p.estado_confirmacion = body.estado_confirmacion
    return _touch_and_return(db, p)


@router.put("/{postulacion_id}/resena-usuario")
def resena_usuario(postulacion_id: int, body: ResenaUsuarioBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    p, op = _own(db, postulacion_id, user)
    _exigir_fin_de_ciclo(p, op, "evaluar el voluntariado")
    p.resena_usuario = body.resena.strip()
    p.calificacion_usuario_org = round(body.calificacion, 1)
    p.resena_usuario_publica = body.es_publica
    return _touch_and_return(db, p)


@router.get("/{postulacion_id}/certificado")
def descargar_certificado(postulacion_id: int, db: DbSession, user: CurrentUser) -> FileResponse:
    p, op = _get(db, postulacion_id)
    if p.usuario_id != user.id:
        ensure_can_manage(db, op, user)
    return files.send(CERT_FOLDER, p.ruta_certificado_pdf, f"certificado_voluntariado_{p.id}.pdf")


# ---------- Organización ----------


@router.patch("/{postulacion_id}/estado")
def cambiar_estado(
    postulacion_id: int,
    body: EstadoPostulacionBody,
    db: DbSession,
    user: CurrentUser,
    background: BackgroundTasks,
) -> dict[str, Any]:
    p, op, _ = _managed(db, postulacion_id, user)
    if p.estado == ESTADO_DECLINADA:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El voluntario declinó esta postulación")
    anterior = p.estado
    p.estado = body.estado
    if body.estado == "No seleccionado":
        p.motivo_no_seleccion = body.motivo_no_seleccion
        p.motivo_no_seleccion_otro = body.motivo_no_seleccion_otro
    data = _touch_and_return(db, p)
    if anterior != body.estado:
        u = db.get(Usuario, p.usuario_id)
        if u:
            motivo = body.motivo_no_seleccion_otro or body.motivo_no_seleccion
            background.add_task(mailer.notify_cambio_estado, u.email, u.nombre or "", op.titulo, body.estado, motivo)
    return data


@router.patch("/{postulacion_id}/asistencia")
def asistencia(postulacion_id: int, body: AsistenciaBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    p, _, _ = _managed(db, postulacion_id, user)
    if p.estado == "No seleccionado":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No se puede registrar asistencia ni horas de un postulante no seleccionado",
        )
    if rechazo_participacion(p):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "El postulante rechazó el voluntariado: no se puede registrar asistencia ni horas",
        )
    if body.asistencia_capacitacion is not None:
        p.asistencia_capacitacion = body.asistencia_capacitacion
    if body.asistencia_actividad is not None:
        p.asistencia_actividad = body.asistencia_actividad
    if body.horas_voluntariado is not None:
        p.horas_voluntariado = body.horas_voluntariado
        db.flush()
        total = db.scalar(
            select(func.coalesce(func.sum(Postulacion.horas_voluntariado), 0)).where(
                Postulacion.usuario_id == p.usuario_id
            )
        )
        u = db.get(Usuario, p.usuario_id)
        if u:
            u.hora_voluntariado = int(total or 0)
    return _touch_and_return(db, p)


@router.put("/{postulacion_id}/resena-org")
def resena_org(postulacion_id: int, body: ResenaOrgBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    p, op, _ = _managed(db, postulacion_id, user)
    _exigir_fin_de_ciclo(p, op, "evaluar al voluntario")
    p.resena_org_sobre_voluntario = (body.resena or "").strip() or None
    p.calificacion_org = round(body.calificacion, 1) if body.calificacion is not None else None
    p.resena_org_publica = body.es_publica
    return _touch_and_return(db, p)


@router.patch("/{postulacion_id}/visibilidad-resena")
def visibilidad_resena_usuario(postulacion_id: int, body: VisibilidadBody, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    """La organización (o admin) decide si la reseña del voluntario se muestra públicamente."""
    p, _, _ = _managed(db, postulacion_id, user)
    p.resena_usuario_publica = body.es_publica
    return _touch_and_return(db, p)


@router.post("/{postulacion_id}/certificado")
async def subir_certificado(
    postulacion_id: int,
    db: DbSession,
    user: CurrentUser,
    certificado: UploadFile = File(...),
) -> dict[str, Any]:
    p, op, _ = _managed(db, postulacion_id, user)
    _exigir_fin_de_ciclo(p, op, "subir el certificado")
    name, _, _ = await files.save_upload(certificado, CERT_FOLDER, f"certificado_{p.id}", {".pdf"}, 10)
    files.delete(CERT_FOLDER, p.ruta_certificado_pdf)
    p.ruta_certificado_pdf = name
    p.tiene_certificado = True
    return _touch_and_return(db, p)


@router.delete("/{postulacion_id}/certificado")
def eliminar_certificado(postulacion_id: int, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    p, _, _ = _managed(db, postulacion_id, user)
    files.delete(CERT_FOLDER, p.ruta_certificado_pdf)
    p.ruta_certificado_pdf = None
    p.tiene_certificado = False
    return _touch_and_return(db, p)


@router.post("/{postulacion_id}/enviar-certificado")
def enviar_certificado(postulacion_id: int, body: EnviarCertificadoBody, db: DbSession, user: CurrentUser) -> dict[str, str]:
    p, op, org = _managed(db, postulacion_id, user)
    path = files.resolve(CERT_FOLDER, p.ruta_certificado_pdf)
    if not path:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No hay certificado subido para esta postulación")
    u = db.get(Usuario, p.usuario_id)
    destino = body.email or (u.email if u else None)
    if not mailer.is_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "El correo saliente no está configurado en el servidor")
    ok = mailer.send_email(
        destino,
        f"Certificado de voluntariado - {op.titulo}",
        "Certificado de voluntariado",
        f"<p>Hola <strong>{escape((u.nombre if u else '') or 'voluntario/a')}</strong>,</p>"
        f"<p>Adjuntamos tu certificado de participación en <strong>{escape(op.titulo)}</strong> "
        f"({escape((org.nombre if org else '') or 'INJUV')}). ¡Gracias por tu compromiso!</p>",
        attachment=("certificado_voluntariado.pdf", path.read_bytes(), "application/pdf"),
    )
    if not ok:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "No se pudo enviar el correo")
    return {"message": f"Certificado enviado a {destino}"}


@router.get("/{postulacion_id}")
def detalle(postulacion_id: int, db: DbSession, user: CurrentUser) -> dict[str, Any]:
    p, op = _get(db, postulacion_id)
    if p.usuario_id != user.id and not is_admin(user.rol):
        ensure_can_manage(db, op, user)
    return serializers.postulacion_para_usuario(p, op, db.get(Organizacion, op.organizacion_id))
