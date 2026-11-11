"""
Modelos ORM (SQLAlchemy 2) que mapean las tablas existentes de la base INJUV.
No crean tablas: el esquema vive en PostgreSQL.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from injuv.db.base import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str | None] = mapped_column(String(100))
    apellido: Mapped[str | None] = mapped_column(String(100))
    rut: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(150))
    telefono: Mapped[str | None] = mapped_column(String(20))
    region: Mapped[str | None] = mapped_column(String(100))
    ciudad: Mapped[str | None] = mapped_column(String(100))
    comuna: Mapped[str | None] = mapped_column(String(100))
    sexo: Mapped[str | None] = mapped_column(String(100))
    fecha_nacimiento: Mapped[date | None] = mapped_column(Date)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    rol: Mapped[str | None] = mapped_column(String(100))
    hora_voluntariado: Mapped[int | None] = mapped_column(Integer)
    certificado_voluntariado: Mapped[Any] = mapped_column(JSONB)
    certificado_personales: Mapped[Any] = mapped_column(JSONB)
    organizacion_afiliada: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    foto_perfil: Mapped[str | None] = mapped_column(String(255))


class Organizacion(Base):
    __tablename__ = "organizaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str | None] = mapped_column(String(100))
    siglas_nombre: Mapped[str | None] = mapped_column(String(100))
    documentos_legales: Mapped[Any] = mapped_column(JSONB)
    rut: Mapped[str | None] = mapped_column(String(20))
    email_contacto: Mapped[str | None] = mapped_column(String(150))
    fecha_creacion: Mapped[date | None] = mapped_column(Date)
    telefono_contacto: Mapped[str | None] = mapped_column(String(20))
    region: Mapped[str | None] = mapped_column(String(100))
    ciudad: Mapped[str | None] = mapped_column(String(100))
    comuna: Mapped[str | None] = mapped_column(String(100))
    descripcion: Mapped[str | None] = mapped_column(Text)
    descripcion_breve: Mapped[str | None] = mapped_column(String(500))
    id_usuario_org: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    area_trabajo: Mapped[str | None] = mapped_column(String(100))
    tipo_org: Mapped[str | None] = mapped_column(String(100))
    sitio_web: Mapped[str | None] = mapped_column(Text)
    redes_sociales: Mapped[Any] = mapped_column(JSONB)
    experiencia_anios: Mapped[int | None] = mapped_column(Integer)
    voluntarios_anuales: Mapped[str | None] = mapped_column(String(100))
    certificacion: Mapped[Any] = mapped_column(JSONB)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    id_usuario_admin: Mapped[int | None] = mapped_column(Integer)
    logo_filename: Mapped[str | None] = mapped_column(String(255))


class SolicitudOrganizacion(Base):
    __tablename__ = "solicitudes_organizacion"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    rut: Mapped[str | None] = mapped_column(String(20))
    email_contacto: Mapped[str | None] = mapped_column(String(150))
    fecha_creacion: Mapped[date | None] = mapped_column(Date)
    region: Mapped[str] = mapped_column(String(100))
    ciudad: Mapped[str] = mapped_column(String(100))
    comuna: Mapped[str] = mapped_column(String(100))
    descripcion: Mapped[str] = mapped_column(Text)
    sitio_web: Mapped[str | None] = mapped_column(Text)
    redes_sociales: Mapped[Any] = mapped_column(JSONB)
    id_usuario_org: Mapped[int] = mapped_column(ForeignKey("usuarios.id"))
    estado: Mapped[str] = mapped_column(String(20), default="pendiente")
    comentario_revision: Mapped[str | None] = mapped_column(Text)
    revisado_por_admin_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class Oportunidad(Base):
    __tablename__ = "oportunidades"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organizacion_id: Mapped[int] = mapped_column(Integer)
    titulo: Mapped[str] = mapped_column(String(200))
    descripcion: Mapped[str] = mapped_column(Text)
    meta_postulantes: Mapped[int | None] = mapped_column(Integer)
    cupo_maximo: Mapped[int | None] = mapped_column(Integer)
    fecha_limite_postulacion: Mapped[date | None] = mapped_column(Date)
    fecha_inicio_voluntariado: Mapped[date | None] = mapped_column(Date)
    fecha_fin_voluntariado: Mapped[date | None] = mapped_column(Date)
    horas_voluntariado: Mapped[int | None] = mapped_column(Integer)
    estado: Mapped[str | None] = mapped_column(String(20))
    responsable_nombre: Mapped[str | None] = mapped_column(String(50))
    responsable_apellido: Mapped[str | None] = mapped_column(String(50))
    responsable_email: Mapped[str | None] = mapped_column(String(255))
    responsable_email_institucional: Mapped[str | None] = mapped_column(String(255))
    responsable_telefono: Mapped[str | None] = mapped_column(String(30))
    region_opor: Mapped[str | None] = mapped_column(String(255))
    ciudad_opor: Mapped[str | None] = mapped_column(String(255))
    comuna_opor: Mapped[str | None] = mapped_column(String(255))
    tipo_de_voluntariado: Mapped[str | None] = mapped_column(String(100))
    encargados_ids: Mapped[Any] = mapped_column(JSONB, default=list)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)


class Postulacion(Base):
    __tablename__ = "postulaciones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    usuario_id: Mapped[int] = mapped_column(Integer)
    oportunidad_id: Mapped[int] = mapped_column(Integer)
    estado: Mapped[str | None] = mapped_column(String(50))
    motivo_no_seleccion: Mapped[str | None] = mapped_column(String(255))
    motivo_no_seleccion_otro: Mapped[str | None] = mapped_column(Text)
    estado_confirmacion: Mapped[str | None] = mapped_column(String(20))
    asistencia_capacitacion: Mapped[str | None] = mapped_column(String(20))
    asistencia_actividad: Mapped[str | None] = mapped_column(String(20))
    tiene_certificado: Mapped[bool | None] = mapped_column(Boolean)
    ruta_certificado_pdf: Mapped[str | None] = mapped_column(Text)
    # Reseña y nota de la organización sobre el voluntario
    resena_org_sobre_voluntario: Mapped[str | None] = mapped_column(Text)
    resena_org_publica: Mapped[bool | None] = mapped_column(Boolean)
    calificacion_org: Mapped[Decimal | None] = mapped_column(Numeric)
    # Reseña y nota del voluntario sobre la organización
    resena_usuario: Mapped[str | None] = mapped_column("reseña_org", Text)
    calificacion_usuario_org: Mapped[Decimal | None] = mapped_column(Numeric)
    resena_usuario_publica: Mapped[bool | None] = mapped_column(Boolean)
    horas_voluntariado: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)


class Noticia(Base):
    __tablename__ = "noticias"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    titulo: Mapped[str] = mapped_column(String(200))
    contenido: Mapped[str] = mapped_column(Text)
    resumen: Mapped[str | None] = mapped_column(String(500))
    autor_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    estado: Mapped[str | None] = mapped_column(String(20), default="activa")
    imagen_noticia: Mapped[str | None] = mapped_column(String(500))
    fecha_publicacion: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class BibliotecaTematica(Base):
    __tablename__ = "biblioteca_tematicas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(80))


class BibliotecaDocumento(Base):
    __tablename__ = "biblioteca_documentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre_archivo: Mapped[str] = mapped_column(String(255))
    archivo_filename: Mapped[str] = mapped_column(String(255))
    archivo_mime: Mapped[str | None] = mapped_column(String(120))
    archivo_tamano_bytes: Mapped[int | None] = mapped_column(BigInteger)
    autor: Mapped[str | None] = mapped_column(String(150))
    fecha_edicion: Mapped[datetime | None] = mapped_column(DateTime)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    tematica_id: Mapped[int | None] = mapped_column(ForeignKey("biblioteca_tematicas.id"))
    organizacion_id: Mapped[int | None] = mapped_column(ForeignKey("organizaciones.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class AcademiaDocumento(Base):
    __tablename__ = "academia_documentos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    organizacion_id: Mapped[int | None] = mapped_column(ForeignKey("organizaciones.id"))
    estado: Mapped[str] = mapped_column(String(20), default="pendiente")
    categoria: Mapped[str | None] = mapped_column(String(80))
    nombre_archivo: Mapped[str] = mapped_column(String(255))
    archivo_filename: Mapped[str] = mapped_column(String(255))
    archivo_mime: Mapped[str | None] = mapped_column(String(120))
    archivo_tamano_bytes: Mapped[int | None] = mapped_column(BigInteger)
    autor: Mapped[str | None] = mapped_column(String(150))
    fecha_edicion: Mapped[datetime | None] = mapped_column(DateTime)
    descripcion: Mapped[str | None] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)


class PortadaConfig(Base):
    __tablename__ = "portada_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    etiqueta: Mapped[str | None] = mapped_column(String(120))
    titulo_linea1: Mapped[str | None] = mapped_column(String(80))
    titulo_linea2: Mapped[str | None] = mapped_column(String(80))
    titulo_resaltado: Mapped[str | None] = mapped_column(String(80))
    subtitulo: Mapped[str | None] = mapped_column(String(300))
    aviso_activo: Mapped[bool] = mapped_column(Boolean, default=False)
    aviso_texto: Mapped[str | None] = mapped_column(String(200))
    aviso_enlace: Mapped[str | None] = mapped_column(String(300))
    updated_at: Mapped[datetime | None] = mapped_column(DateTime)


class PortadaFoto(Base):
    __tablename__ = "portada_fotos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seccion: Mapped[str] = mapped_column(String(20))
    archivo: Mapped[str] = mapped_column(String(255))
    archivo_original: Mapped[str | None] = mapped_column(String(255))
    alt: Mapped[str] = mapped_column(String(200), default="")
    orden: Mapped[int] = mapped_column(Integer, default=0)
    activa: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
