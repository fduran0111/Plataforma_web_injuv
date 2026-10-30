"""Perfil del usuario autenticado: datos, foto, certificados personales y postulaciones."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select

from injuv.api.auth_routes import session_payload
from injuv.api.deps import CurrentUser, DbSession
from injuv.db.models import Oportunidad, Organizacion, Postulacion, Usuario
from injuv.schemas.perfiles import EliminarCuentaBody, PerfilUsuarioBody
from injuv.security.passwords import verify_password
from injuv.services import files, serializers
from injuv.services.cuentas import eliminar_usuario

router = APIRouter(prefix="/usuarios", tags=["Usuarios"])

FOTO_FOLDER = "perfiles_usuarios"
CERT_PERSONAL_FOLDER = "certificados_personales"
TipoCertificado = Literal["antecedentes", "inhabilidades"]


@router.put("/me")
def actualizar_perfil(body: PerfilUsuarioBody, user: CurrentUser, db: DbSession) -> dict[str, Any]:
    email = body.email.lower()
    otro = db.scalar(select(Usuario.id).where(func.lower(Usuario.email) == email, Usuario.id != user.id))
    if otro:
        raise HTTPException(status.HTTP_409_CONFLICT, "Ese email ya está en uso por otra cuenta")
    for field, value in body.model_dump().items():
        setattr(user, field, email if field == "email" else value)
    db.commit()
    return session_payload(db, user)


@router.post("/me/foto")
async def subir_foto(user: CurrentUser, db: DbSession, imagen: UploadFile = File(...)) -> dict[str, Any]:
    name, _, _ = await files.save_upload(imagen, FOTO_FOLDER, f"user_{user.id}", files.IMAGE_EXTS, 5)
    files.delete(FOTO_FOLDER, user.foto_perfil)
    user.foto_perfil = name
    db.commit()
    return session_payload(db, user)


@router.delete("/me/foto")
def eliminar_foto(user: CurrentUser, db: DbSession) -> dict[str, Any]:
    files.delete(FOTO_FOLDER, user.foto_perfil)
    user.foto_perfil = None
    db.commit()
    return session_payload(db, user)


@router.get("/{user_id}/foto")
def ver_foto(user_id: int, db: DbSession) -> FileResponse:
    u = db.get(Usuario, user_id)
    return files.send(FOTO_FOLDER, u.foto_perfil if u else None)


@router.get("/me/postulaciones")
def mis_postulaciones(user: CurrentUser, db: DbSession) -> list[dict[str, Any]]:
    rows = db.execute(
        select(Postulacion, Oportunidad, Organizacion)
        .join(Oportunidad, Oportunidad.id == Postulacion.oportunidad_id)
        .outerjoin(Organizacion, Organizacion.id == Oportunidad.organizacion_id)
        .where(Postulacion.usuario_id == user.id)
        .order_by(Postulacion.created_at.desc().nullslast())
    ).all()
    return [serializers.postulacion_para_usuario(p, op, org) for p, op, org in rows]


@router.post("/me/certificados")
async def subir_certificado_personal(
    user: CurrentUser,
    db: DbSession,
    tipo: TipoCertificado = Form(...),
    fecha_emision: date = Form(...),
    archivo: UploadFile = File(...),
) -> dict[str, Any]:
    dias = (date.today() - fecha_emision).days
    if dias < 0 or dias > 183:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El certificado debe tener menos de 6 meses de antigüedad")
    name, _, _ = await files.save_upload(archivo, CERT_PERSONAL_FOLDER, f"{tipo}_{user.id}", {".pdf"}, 10)
    actuales = [c for c in (user.certificado_personales or []) if isinstance(c, dict)]
    for c in actuales:
        if c.get("tipo") == tipo:
            files.delete(CERT_PERSONAL_FOLDER, c.get("archivo"))
    user.certificado_personales = [c for c in actuales if c.get("tipo") != tipo] + [
        {
            "tipo": tipo,
            "fecha_emision": fecha_emision.isoformat(),
            "archivo": name,
            "nombre_archivo": archivo.filename,
            "subido_en": datetime.now().isoformat(timespec="seconds"),
        }
    ]
    db.commit()
    return session_payload(db, user)


def _certificado(user: Usuario, tipo: str) -> dict[str, Any] | None:
    return next((c for c in (user.certificado_personales or []) if isinstance(c, dict) and c.get("tipo") == tipo), None)


@router.get("/me/certificados/{tipo}")
def descargar_certificado_personal(tipo: TipoCertificado, user: CurrentUser) -> FileResponse:
    cert = _certificado(user, tipo)
    return files.send(CERT_PERSONAL_FOLDER, cert.get("archivo") if cert else None, f"{tipo}.pdf")


@router.delete("/me/certificados/{tipo}")
def eliminar_certificado_personal(tipo: TipoCertificado, user: CurrentUser, db: DbSession) -> dict[str, Any]:
    cert = _certificado(user, tipo)
    if cert:
        files.delete(CERT_PERSONAL_FOLDER, cert.get("archivo"))
        user.certificado_personales = [c for c in user.certificado_personales if c is not cert]
        db.commit()
    return session_payload(db, user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_cuenta(body: EliminarCuentaBody, user: CurrentUser, db: DbSession) -> None:
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La contraseña no es correcta")
    eliminar_usuario(db, user)
