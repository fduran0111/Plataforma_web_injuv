"""Noticias: lectura pública y gestión por administradores."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select

from injuv.api.deps import AdminUser, DbSession
from injuv.db.models import Noticia, Usuario
from injuv.services import files, serializers
from injuv.services.catalogo import ESTADOS_NOTICIA

router = APIRouter(prefix="/noticias", tags=["Noticias"])

IMG_FOLDER = "imagenes_noticias"


def _get(db: DbSession, noticia_id: int) -> Noticia:
    n = db.get(Noticia, noticia_id)
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Noticia no encontrada")
    return n


def _serialize(db: DbSession, n: Noticia) -> dict[str, Any]:
    return serializers.noticia(n, db.get(Usuario, n.autor_id) if n.autor_id else None)


def _validar_estado(estado: str) -> str:
    if estado not in ESTADOS_NOTICIA:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Estado inválido: {', '.join(ESTADOS_NOTICIA)}")
    return estado


@router.get("")
def listar(db: DbSession, limit: int = 100) -> list[dict[str, Any]]:
    stmt = (
        select(Noticia, Usuario)
        .outerjoin(Usuario, Usuario.id == Noticia.autor_id)
        .where(Noticia.estado == "activa")
        .order_by(Noticia.fecha_publicacion.desc().nullslast(), Noticia.id.desc())
        .limit(limit)
    )
    return [serializers.noticia(n, u) for n, u in db.execute(stmt).all()]


@router.get("/admin")
def listar_todas(db: DbSession, _: AdminUser) -> list[dict[str, Any]]:
    stmt = (
        select(Noticia, Usuario)
        .outerjoin(Usuario, Usuario.id == Noticia.autor_id)
        .order_by(Noticia.created_at.desc().nullslast(), Noticia.id.desc())
    )
    return [serializers.noticia(n, u) for n, u in db.execute(stmt).all()]


@router.get("/imagen/{filename}")
def imagen(filename: str) -> FileResponse:
    return files.send(IMG_FOLDER, filename)


@router.get("/{noticia_id}")
def obtener(noticia_id: int, db: DbSession) -> dict[str, Any]:
    n = _get(db, noticia_id)
    if n.estado != "activa":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Noticia no encontrada")
    return _serialize(db, n)


@router.post("", status_code=status.HTTP_201_CREATED)
async def crear(
    db: DbSession,
    admin: AdminUser,
    titulo: str = Form(..., min_length=3, max_length=200),
    contenido: str = Form(..., min_length=10),
    resumen: str = Form("", max_length=500),
    estado: str = Form("activa"),
    imagen: UploadFile | None = File(None),
) -> dict[str, Any]:
    now = datetime.now()
    n = Noticia(
        titulo=titulo.strip(),
        contenido=contenido.strip(),
        resumen=resumen.strip() or None,
        estado=_validar_estado(estado),
        autor_id=admin.id,
        fecha_publicacion=now,
        created_at=now,
        updated_at=now,
    )
    if imagen and imagen.filename:
        n.imagen_noticia, _, _ = await files.save_upload(imagen, IMG_FOLDER, "noticia", files.IMAGE_EXTS, 5)
    db.add(n)
    db.commit()
    return _serialize(db, n)


@router.put("/{noticia_id}")
async def actualizar(
    noticia_id: int,
    db: DbSession,
    _: AdminUser,
    titulo: str = Form(..., min_length=3, max_length=200),
    contenido: str = Form(..., min_length=10),
    resumen: str = Form("", max_length=500),
    estado: str = Form("activa"),
    quitar_imagen: bool = Form(False),
    imagen: UploadFile | None = File(None),
) -> dict[str, Any]:
    n = _get(db, noticia_id)
    n.titulo, n.contenido = titulo.strip(), contenido.strip()
    n.resumen = resumen.strip() or None
    n.estado = _validar_estado(estado)
    if (imagen and imagen.filename) or quitar_imagen:
        files.delete(IMG_FOLDER, n.imagen_noticia)
        n.imagen_noticia = None
    if imagen and imagen.filename:
        n.imagen_noticia, _, _ = await files.save_upload(imagen, IMG_FOLDER, "noticia", files.IMAGE_EXTS, 5)
    db.commit()
    return _serialize(db, n)


@router.delete("/{noticia_id}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar(noticia_id: int, db: DbSession, _: AdminUser) -> None:
    n = _get(db, noticia_id)
    files.delete(IMG_FOLDER, n.imagen_noticia)
    db.delete(n)
    db.commit()
