"""Conversión de modelos ORM a diccionarios JSON para la API."""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

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
from injuv.security.rbac import normalize_role


def _num(value: Decimal | None) -> float | None:
    return float(value) if value is not None else None


def _list(value: Any) -> list:
    return value if isinstance(value, list) else []


def nombre_completo(u: Usuario | None) -> str:
    if not u:
        return ""
    return f"{u.nombre or ''} {u.apellido or ''}".strip() or (u.email or "Usuario")


def edad(nacimiento: date | None) -> int | None:
    if not nacimiento:
        return None
    hoy = date.today()
    return hoy.year - nacimiento.year - ((hoy.month, hoy.day) < (nacimiento.month, nacimiento.day))


def usuario(u: Usuario) -> dict[str, Any]:
    return {
        "id": u.id,
        "nombre": u.nombre or "",
        "apellido": u.apellido or "",
        "email": u.email or "",
        "rut": u.rut or "",
        "telefono": u.telefono or "",
        "region": u.region or "",
        "ciudad": u.ciudad or "",
        "comuna": u.comuna or "",
        "sexo": u.sexo or "",
        "fecha_nacimiento": u.fecha_nacimiento,
        "rol": normalize_role(u.rol),
        "horas_voluntariado": u.hora_voluntariado or 0,
        "tiene_foto": bool(u.foto_perfil),
        "foto_version": u.foto_perfil,
        "certificados_personales": [
            {k: c.get(k) for k in ("tipo", "fecha_emision", "nombre_archivo", "subido_en")}
            for c in _list(u.certificado_personales)
            if isinstance(c, dict)
        ],
        "created_at": u.created_at,
    }


def organizacion(o: Organizacion, num_oportunidades: int | None = None) -> dict[str, Any]:
    data = {
        "id": o.id,
        "nombre": o.nombre or "",
        "siglas_nombre": o.siglas_nombre or "",
        "rut": o.rut or "",
        "email_contacto": o.email_contacto or "",
        "telefono_contacto": o.telefono_contacto or "",
        "region": o.region or "",
        "ciudad": o.ciudad or "",
        "comuna": o.comuna or "",
        "descripcion": o.descripcion or "",
        "descripcion_breve": o.descripcion_breve or "",
        "area_trabajo": o.area_trabajo or "",
        "tipo_org": o.tipo_org or "",
        "sitio_web": o.sitio_web or "",
        "redes_sociales": _list(o.redes_sociales),
        "experiencia_anios": o.experiencia_anios,
        "voluntarios_anuales": o.voluntarios_anuales or "",
        "certificacion": _list(o.certificacion),
        "fecha_creacion": o.fecha_creacion,
        "id_usuario_org": o.id_usuario_org,
        "tiene_logo": bool(o.logo_filename),
        "logo_version": o.logo_filename,
        "created_at": o.created_at,
    }
    if num_oportunidades is not None:
        data["num_oportunidades"] = num_oportunidades
    return data


def oportunidad(op: Oportunidad, org: Organizacion | None = None, num_postulaciones: int = 0) -> dict[str, Any]:
    return {
        "id": op.id,
        "titulo": op.titulo,
        "descripcion": op.descripcion,
        "organizacion_id": op.organizacion_id,
        "organizacion_nombre": (org.nombre if org else "") or "",
        "organizacion_tiene_logo": bool(org and org.logo_filename),
        "meta_postulantes": op.meta_postulantes,
        "cupo_maximo": op.cupo_maximo,
        "fecha_limite_postulacion": op.fecha_limite_postulacion,
        "fecha_inicio_voluntariado": op.fecha_inicio_voluntariado,
        "fecha_fin_voluntariado": op.fecha_fin_voluntariado,
        "horas_voluntariado": op.horas_voluntariado,
        "estado": op.estado or "activa",
        "responsable_nombre": op.responsable_nombre or "",
        "responsable_apellido": op.responsable_apellido or "",
        "responsable_email": op.responsable_email or "",
        "responsable_email_institucional": op.responsable_email_institucional or "",
        "responsable_telefono": op.responsable_telefono or "",
        "region": op.region_opor or (org.region if org else "") or "",
        "ciudad": op.ciudad_opor or (org.ciudad if org else "") or "",
        "comuna": op.comuna_opor or (org.comuna if org else "") or "",
        "tipo_de_voluntariado": op.tipo_de_voluntariado or "",
        "num_postulaciones": num_postulaciones,
        "created_at": op.created_at,
    }


def postulacion_base(p: Postulacion) -> dict[str, Any]:
    return {
        "id": p.id,
        "usuario_id": p.usuario_id,
        "oportunidad_id": p.oportunidad_id,
        "estado": p.estado or "Pendiente de revisión",
        "estado_confirmacion": p.estado_confirmacion or "Pendiente",
        "motivo_no_seleccion": p.motivo_no_seleccion or "",
        "motivo_no_seleccion_otro": p.motivo_no_seleccion_otro or "",
        "asistencia_capacitacion": p.asistencia_capacitacion or "No aplica",
        "asistencia_actividad": p.asistencia_actividad or "No aplica",
        "horas_voluntariado": p.horas_voluntariado or 0,
        "tiene_certificado": bool(p.tiene_certificado and p.ruta_certificado_pdf),
        "resena_org": p.resena_org_sobre_voluntario or "",
        "resena_org_publica": bool(p.resena_org_publica),
        "calificacion_org": _num(p.calificacion_org),
        "resena_usuario": p.resena_usuario or "",
        "calificacion_usuario": _num(p.calificacion_usuario_org),
        "resena_usuario_publica": p.resena_usuario_publica is not False,
        "created_at": p.created_at,
        "updated_at": p.updated_at,
    }


def postulacion_para_usuario(p: Postulacion, op: Oportunidad | None, org: Organizacion | None) -> dict[str, Any]:
    data = postulacion_base(p)
    data.update(
        oportunidad_titulo=op.titulo if op else "",
        oportunidad_estado=(op.estado if op else "") or "",
        organizacion_id=org.id if org else None,
        organizacion_nombre=(org.nombre if org else "") or "",
    )
    return data


def postulacion_para_org(p: Postulacion, u: Usuario | None) -> dict[str, Any]:
    data = postulacion_base(p)
    data.update(
        usuario_nombre=nombre_completo(u),
        usuario_email=(u.email if u else "") or "",
        usuario_telefono=(u.telefono if u else "") or "",
        usuario_region=(u.region if u else "") or "",
        usuario_comuna=(u.comuna if u else "") or "",
        usuario_sexo=(u.sexo if u else "") or "",
        usuario_rut=(u.rut if u else "") or "",
        usuario_edad=edad(u.fecha_nacimiento) if u else None,
        usuario_tiene_foto=bool(u and u.foto_perfil),
    )
    return data


def noticia(n: Noticia, autor: Usuario | None = None) -> dict[str, Any]:
    return {
        "id": n.id,
        "titulo": n.titulo,
        "contenido": n.contenido,
        "resumen": n.resumen or "",
        "estado": n.estado or "activa",
        "autor_id": n.autor_id,
        "autor_nombre": nombre_completo(autor) if autor else "INJUV",
        "imagen": n.imagen_noticia or None,
        "fecha_publicacion": n.fecha_publicacion or n.created_at,
        "created_at": n.created_at,
        "updated_at": n.updated_at,
    }


def documento(
    d: BibliotecaDocumento | AcademiaDocumento,
    seccion: str,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    data: dict[str, Any] = {
        "id": d.id,
        "seccion": seccion,
        "nombre_archivo": d.nombre_archivo,
        "archivo_mime": d.archivo_mime,
        "archivo_tamano_bytes": d.archivo_tamano_bytes,
        "autor": d.autor or "",
        "descripcion": d.descripcion or "",
        "fecha_edicion": d.fecha_edicion,
        "created_at": d.created_at,
        "organizacion_id": d.organizacion_id,
    }
    if isinstance(d, BibliotecaDocumento):
        data["tematica_id"] = d.tematica_id
    else:
        data["estado"] = d.estado or "pendiente"
        data["categoria"] = d.categoria
    if extra:
        data.update(extra)
    return data


def solicitud(s: SolicitudOrganizacion, solicitante: Usuario | None, revisor: Usuario | None) -> dict[str, Any]:
    return {
        "id": s.id,
        "nombre": s.nombre,
        "rut": s.rut or "",
        "email_contacto": s.email_contacto or "",
        "fecha_creacion": s.fecha_creacion,
        "region": s.region,
        "ciudad": s.ciudad,
        "comuna": s.comuna,
        "descripcion": s.descripcion,
        "sitio_web": s.sitio_web or "",
        "redes_sociales": _list(s.redes_sociales),
        "estado": s.estado,
        "comentario_revision": s.comentario_revision or "",
        "id_usuario_org": s.id_usuario_org,
        "usuario_nombre": nombre_completo(solicitante),
        "usuario_email": (solicitante.email if solicitante else "") or "",
        "revisado_por": nombre_completo(revisor) if revisor else "",
        "created_at": s.created_at,
        "reviewed_at": s.reviewed_at,
    }
