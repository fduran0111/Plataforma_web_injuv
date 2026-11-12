"""Portada editable: configuración pública y administración de textos/fotos."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.exc import DBAPIError

from injuv.api.deps import AdminUser, DbSession
from injuv.db.models import PortadaConfig, PortadaFoto
from injuv.schemas.portada import PortadaConfigBody, PortadaFotoPatch, PortadaOrdenBody
from injuv.services import files

router = APIRouter(prefix="/portada", tags=["Portada"])
FOLDER = "portada_fotos"


CAMPOS = (
    "etiqueta", "titulo_linea1", "titulo_linea2", "titulo_resaltado", "subtitulo",
    "aviso_activo", "aviso_texto", "aviso_enlace", "acceso_titulo", "acceso_subtitulo", "acceso_cita",
)


def _cfg(c: PortadaConfig | None) -> dict[str, Any]:
    d = {k: getattr(c, k, None) for k in CAMPOS}
    d["aviso_activo"] = bool(d["aviso_activo"])
    return d


def _foto(f: PortadaFoto, admin: bool = False) -> dict[str, Any]:
    d = {"id": f.id, "archivo": f.archivo, "alt": f.alt}
    if admin:
        d["activa"] = bool(f.activa)
        d["orden"] = f.orden
        d["archivo_original"] = f.archivo_original
    return d


def _payload(db, admin: bool) -> dict[str, Any]:
    cfg = db.get(PortadaConfig, 1)
    fotos = {"inicio": [], "galeria": [], "acceso": []}
    for f in db.scalars(select(PortadaFoto).order_by(PortadaFoto.orden, PortadaFoto.id)):
        if f.seccion in fotos and (admin or f.activa):
            fotos[f.seccion].append(_foto(f, admin))
    return {"config": _cfg(cfg), "fotos": fotos}


@router.get("")
def portada_publica(db: DbSession) -> dict[str, Any]:
    try:
        return _payload(db, admin=False)
    except DBAPIError:
        db.rollback()
        return {"config": _cfg(None), "fotos": {"inicio": [], "galeria": [], "acceso": []}}


@router.get("/foto/{filename}")
def foto(filename: str) -> FileResponse:
    return files.send(FOLDER, filename)


@router.get("/admin")
def portada_admin(db: DbSession, _: AdminUser) -> dict[str, Any]:
    return _payload(db, admin=True)


@router.put("/config")
def guardar_config(body: PortadaConfigBody, db: DbSession, _: AdminUser) -> dict[str, Any]:
    c = db.get(PortadaConfig, 1) or PortadaConfig(id=1)
    for campo in CAMPOS:
        setattr(c, campo, getattr(body, campo))
    c.updated_at = datetime.now()
    db.add(c)
    db.commit()
    return _payload(db, admin=True)


@router.post("/fotos", status_code=status.HTTP_201_CREATED)
async def subir_foto(
    db: DbSession,
    _: AdminUser,
    seccion: Literal["inicio", "galeria", "acceso"] = Form(...),
    alt: str = Form(..., min_length=3, max_length=200),
    imagen: UploadFile = File(...),
    original: UploadFile | None = File(None),
) -> dict[str, Any]:
    nombre_orig: str | None = None
    if original is not None and original.filename:
        nombre_orig, _m, _t = await files.save_upload(original, FOLDER, f"portada_{seccion}_original", files.IMAGE_EXTS, 15)
    try:
        nombre, _mime, _tam = await files.save_upload(imagen, FOLDER, f"portada_{seccion}", files.IMAGE_EXTS, 5)
    except HTTPException:
        files.delete(FOLDER, nombre_orig)
        raise
    max_orden = db.scalar(select(func.max(PortadaFoto.orden)).where(PortadaFoto.seccion == seccion)) or 0
    db.add(PortadaFoto(seccion=seccion, archivo=nombre, archivo_original=nombre_orig, alt=alt.strip(), orden=max_orden + 1))
    db.commit()
    return _payload(db, admin=True)


@router.put("/fotos/orden")
def reordenar(body: PortadaOrdenBody, db: DbSession, _: AdminUser) -> dict[str, Any]:
    fotos = {f.id: f for f in db.scalars(select(PortadaFoto).where(PortadaFoto.seccion == body.seccion))}
    if set(body.ids) != set(fotos):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La lista de ids no coincide con las fotos de la sección")
    for i, fid in enumerate(body.ids):
        fotos[fid].orden = i
    db.commit()
    return _payload(db, admin=True)


@router.put("/fotos/{foto_id}/imagen")
async def reencuadrar_foto(foto_id: int, db: DbSession, _: AdminUser, imagen: UploadFile = File(...)) -> dict[str, Any]:
    f = _foto_o_404(db, foto_id)
    nombre, _mime, _tam = await files.save_upload(imagen, FOLDER, f"portada_{f.seccion}", files.IMAGE_EXTS, 5)
    anterior = f.archivo
    f.archivo = nombre
    db.commit()
    files.delete(FOLDER, anterior)
    return _payload(db, admin=True)


def _foto_o_404(db: DbSession, foto_id: int) -> PortadaFoto:
    f = db.get(PortadaFoto, foto_id)
    if not f:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Esa foto no existe")
    return f


@router.patch("/fotos/{foto_id}")
def editar_foto(foto_id: int, body: PortadaFotoPatch, db: DbSession, _: AdminUser) -> dict[str, Any]:
    f = _foto_o_404(db, foto_id)
    if body.alt is not None:
        f.alt = body.alt
    if body.activa is not None:
        f.activa = body.activa
    db.commit()
    return _payload(db, admin=True)


@router.delete("/fotos/{foto_id}")
def borrar_foto(foto_id: int, db: DbSession, _: AdminUser) -> dict[str, Any]:
    f = _foto_o_404(db, foto_id)
    archivo = f.archivo
    original = f.archivo_original
    db.delete(f)
    db.commit()
    files.delete(FOLDER, archivo)
    files.delete(FOLDER, original)
    return _payload(db, admin=True)
