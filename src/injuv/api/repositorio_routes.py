"""Repositorio de documentos: Biblioteca (admin) y Academia (admin + organizaciones con aprobación)."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select

from injuv.api.deps import AdminUser, DbSession, MemberOrganization, OptionalUser
from injuv.db.models import AcademiaDocumento, BibliotecaDocumento, BibliotecaTematica, Organizacion
from injuv.security.rbac import is_admin
from injuv.services import files, serializers
from injuv.services.catalogo import CATEGORIAS_ACADEMIA

router = APIRouter(tags=["Repositorio"])

Seccion = Literal["biblioteca", "academia"]
FOLDERS = {"biblioteca": "repositorio_biblioteca", "academia": "repositorio_academia"}
BIBLIOTECA_MB, ACADEMIA_MB = 25, 500


def _academia_con_org(db: DbSession, docs_stmt) -> list[dict[str, Any]]:
    rows = db.execute(docs_stmt.add_columns(Organizacion.nombre).outerjoin(
        Organizacion, Organizacion.id == AcademiaDocumento.organizacion_id
    )).all()
    return [serializers.documento(d, "academia", {"organizacion_nombre": nombre or "INJUV"}) for d, nombre in rows]


def _categoria(valor: str | None, requerida: bool) -> str | None:
    cat = (valor or "").strip().lower() or None
    if cat and cat not in CATEGORIAS_ACADEMIA:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Categoría inválida")
    if requerida and not cat:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Selecciona una categoría")
    return cat


# ---------- Público ----------


@router.get("/biblioteca/tematicas")
def tematicas(db: DbSession) -> list[dict[str, Any]]:
    return [{"id": t.id, "nombre": t.nombre} for t in db.scalars(select(BibliotecaTematica).order_by(BibliotecaTematica.nombre))]


@router.get("/biblioteca/documentos")
def biblioteca(db: DbSession, tematica_id: int | None = None, q: str | None = None) -> list[dict[str, Any]]:
    stmt = (
        select(BibliotecaDocumento, BibliotecaTematica.nombre)
        .outerjoin(BibliotecaTematica, BibliotecaTematica.id == BibliotecaDocumento.tematica_id)
        .order_by(BibliotecaDocumento.created_at.desc())
    )
    if tematica_id:
        stmt = stmt.where(BibliotecaDocumento.tematica_id == tematica_id)
    if q:
        stmt = stmt.where(BibliotecaDocumento.nombre_archivo.ilike(f"%{q}%"))
    return [serializers.documento(d, "biblioteca", {"tematica_nombre": t}) for d, t in db.execute(stmt).all()]


@router.get("/academia/documentos")
def academia(db: DbSession, categoria: str | None = None) -> list[dict[str, Any]]:
    stmt = select(AcademiaDocumento).where(AcademiaDocumento.estado == "aprobado").order_by(AcademiaDocumento.created_at.desc())
    if categoria:
        stmt = stmt.where(AcademiaDocumento.categoria == categoria)
    return _academia_con_org(db, stmt)


@router.get("/repositorio/{seccion}/{doc_id}/descargar")
def descargar(seccion: Seccion, doc_id: int, db: DbSession, user: OptionalUser) -> FileResponse:
    doc = db.get(BibliotecaDocumento if seccion == "biblioteca" else AcademiaDocumento, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado")
    if isinstance(doc, AcademiaDocumento) and doc.estado != "aprobado":
        owner = doc.organizacion_id and user and db.scalar(
            select(Organizacion.id).where(Organizacion.id == doc.organizacion_id, Organizacion.id_usuario_org == user.id)
        )
        if not (user and (is_admin(user.rol) or owner)):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado")
    return files.send(FOLDERS[seccion], doc.archivo_filename, doc.nombre_archivo)


# ---------- Administración ----------


@router.get("/admin/repositorio")
def admin_listar(db: DbSession, _: AdminUser) -> dict[str, Any]:
    return {
        "biblioteca": biblioteca(db),
        "academia": _academia_con_org(db, select(AcademiaDocumento).order_by(AcademiaDocumento.created_at.desc())),
    }


@router.post("/admin/repositorio/{seccion}", status_code=status.HTTP_201_CREATED)
async def admin_subir(
    seccion: Seccion,
    db: DbSession,
    _: AdminUser,
    archivo: UploadFile = File(...),
    nombre_archivo: str = Form("", max_length=255),
    descripcion: str = Form("", max_length=500),
    autor: str = Form("", max_length=150),
    tematica_id: int | None = Form(None),
    categoria: str | None = Form(None),
) -> dict[str, Any]:
    if seccion == "academia" and not descripcion.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La descripción es obligatoria en Academia")
    allowed = files.DOC_EXTS | files.VIDEO_EXTS if seccion == "academia" else files.DOC_EXTS
    max_mb = ACADEMIA_MB if seccion == "academia" else BIBLIOTECA_MB
    name, mime, size = await files.save_upload(archivo, FOLDERS[seccion], seccion, allowed, max_mb)
    common = dict(
        nombre_archivo=(nombre_archivo.strip() or archivo.filename or "Documento")[:255],
        archivo_filename=name,
        archivo_mime=mime,
        archivo_tamano_bytes=size,
        autor=autor.strip() or None,
        descripcion=descripcion.strip() or None,
        fecha_edicion=datetime.now(),
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    if seccion == "biblioteca":
        doc: BibliotecaDocumento | AcademiaDocumento = BibliotecaDocumento(tematica_id=tematica_id, **common)
    else:
        doc = AcademiaDocumento(estado="aprobado", categoria=_categoria(categoria, False), **common)
    db.add(doc)
    db.commit()
    return serializers.documento(doc, seccion)


@router.delete("/admin/repositorio/{seccion}/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_eliminar(seccion: Seccion, doc_id: int, db: DbSession, _: AdminUser) -> None:
    doc = db.get(BibliotecaDocumento if seccion == "biblioteca" else AcademiaDocumento, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado")
    files.delete(FOLDERS[seccion], doc.archivo_filename)
    db.delete(doc)
    db.commit()


@router.patch("/admin/academia/{doc_id}/estado")
def admin_estado_academia(
    doc_id: int, db: DbSession, _: AdminUser, estado: Literal["pendiente", "aprobado", "rechazado"] = Form(...)
) -> dict[str, Any]:
    doc = db.get(AcademiaDocumento, doc_id)
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado")
    doc.estado = estado
    db.commit()
    return serializers.documento(doc, "academia")


# ---------- Academia de la organización ----------


@router.get("/organizaciones/mia/academia")
def org_listar(db: DbSession, org: MemberOrganization) -> list[dict[str, Any]]:
    docs = db.scalars(
        select(AcademiaDocumento).where(AcademiaDocumento.organizacion_id == org.id).order_by(AcademiaDocumento.created_at.desc())
    )
    return [serializers.documento(d, "academia") for d in docs]


def _org_doc(db: DbSession, org: Organizacion, doc_id: int) -> AcademiaDocumento:
    doc = db.scalar(select(AcademiaDocumento).where(AcademiaDocumento.id == doc_id, AcademiaDocumento.organizacion_id == org.id))
    if not doc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Documento no encontrado")
    return doc


@router.post("/organizaciones/mia/academia", status_code=status.HTTP_201_CREATED)
async def org_subir(
    db: DbSession,
    org: MemberOrganization,
    archivo: UploadFile = File(...),
    nombre_archivo: str = Form(..., min_length=2, max_length=255),
    descripcion: str = Form(..., min_length=5, max_length=500),
    categoria: str = Form(...),
    fecha_creacion: date | None = Form(None),
) -> dict[str, Any]:
    cat = _categoria(categoria, True)
    name, mime, size = await files.save_upload(
        archivo, FOLDERS["academia"], "academia", files.DOC_EXTS | files.VIDEO_EXTS, ACADEMIA_MB
    )
    now = datetime.now()
    doc = AcademiaDocumento(
        organizacion_id=org.id,
        estado="pendiente",
        categoria=cat,
        nombre_archivo=nombre_archivo.strip(),
        archivo_filename=name,
        archivo_mime=mime,
        archivo_tamano_bytes=size,
        autor=org.nombre,
        descripcion=descripcion.strip(),
        fecha_edicion=datetime.combine(fecha_creacion, datetime.min.time()) if fecha_creacion else now,
        created_at=now,
        updated_at=now,
    )
    db.add(doc)
    db.commit()
    return serializers.documento(doc, "academia")


@router.put("/organizaciones/mia/academia/{doc_id}")
async def org_editar(
    doc_id: int,
    db: DbSession,
    org: MemberOrganization,
    nombre_archivo: str = Form(..., min_length=2, max_length=255),
    descripcion: str = Form(..., min_length=5, max_length=500),
    categoria: str = Form(...),
    archivo: UploadFile | None = File(None),
) -> dict[str, Any]:
    doc = _org_doc(db, org, doc_id)
    if doc.estado == "aprobado":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Un documento aprobado no se puede editar")
    doc.nombre_archivo, doc.descripcion = nombre_archivo.strip(), descripcion.strip()
    doc.categoria = _categoria(categoria, True)
    if archivo and archivo.filename:
        name, mime, size = await files.save_upload(
            archivo, FOLDERS["academia"], "academia", files.DOC_EXTS | files.VIDEO_EXTS, ACADEMIA_MB
        )
        files.delete(FOLDERS["academia"], doc.archivo_filename)
        doc.archivo_filename, doc.archivo_mime, doc.archivo_tamano_bytes = name, mime, size
    doc.estado = "pendiente"
    db.commit()
    return serializers.documento(doc, "academia")


@router.delete("/organizaciones/mia/academia/{doc_id}", status_code=status.HTTP_204_NO_CONTENT)
def org_eliminar(doc_id: int, db: DbSession, org: MemberOrganization) -> None:
    doc = _org_doc(db, org, doc_id)
    files.delete(FOLDERS["academia"], doc.archivo_filename)
    db.delete(doc)
    db.commit()
