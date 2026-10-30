"""Operaciones de cuentas que afectan varias tablas."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from injuv.db.models import (
    AcademiaDocumento,
    Noticia,
    Oportunidad,
    Organizacion,
    Postulacion,
    SolicitudOrganizacion,
    Usuario,
)
from injuv.services import files


def eliminar_organizacion(db: Session, org: Organizacion) -> None:
    """Elimina la organización con sus oportunidades, postulaciones y documentos de Academia."""
    op_ids = list(db.scalars(select(Oportunidad.id).where(Oportunidad.organizacion_id == org.id)))
    if op_ids:
        for p in db.scalars(select(Postulacion).where(Postulacion.oportunidad_id.in_(op_ids))):
            files.delete("certificados_voluntarios", p.ruta_certificado_pdf)
            db.delete(p)
        for op in db.scalars(select(Oportunidad).where(Oportunidad.id.in_(op_ids))):
            db.delete(op)
    for doc in db.scalars(select(AcademiaDocumento).where(AcademiaDocumento.organizacion_id == org.id)):
        files.delete("repositorio_academia", doc.archivo_filename)
        db.delete(doc)
    files.delete("logos_organizaciones", org.logo_filename)
    db.delete(org)


def eliminar_usuario(db: Session, user: Usuario) -> None:
    """Elimina la cuenta, su organización (si administra una), postulaciones y archivos."""
    org = db.scalar(select(Organizacion).where(Organizacion.id_usuario_org == user.id))
    if org:
        eliminar_organizacion(db, org)
    for p in db.scalars(select(Postulacion).where(Postulacion.usuario_id == user.id)):
        files.delete("certificados_voluntarios", p.ruta_certificado_pdf)
        db.delete(p)
    for s in db.scalars(select(SolicitudOrganizacion).where(SolicitudOrganizacion.id_usuario_org == user.id)):
        db.delete(s)
    for s in db.scalars(select(SolicitudOrganizacion).where(SolicitudOrganizacion.revisado_por_admin_id == user.id)):
        s.revisado_por_admin_id = None
    for n in db.scalars(select(Noticia).where(Noticia.autor_id == user.id)):
        n.autor_id = None
    files.delete("perfiles_usuarios", user.foto_perfil)
    for c in user.certificado_personales or []:
        if isinstance(c, dict):
            files.delete("certificados_personales", c.get("archivo"))
    db.flush()
    db.delete(user)
    db.commit()
