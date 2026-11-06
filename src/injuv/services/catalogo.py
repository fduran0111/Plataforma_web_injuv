"""Valores válidos de estados y categorías usados por la plataforma."""
from __future__ import annotations

from datetime import date

ESTADOS_OPORTUNIDAD = ("activa", "abierta", "cerrada")
ESTADOS_OPORTUNIDAD_ABIERTOS = ("activa", "abierta")

ESTADOS_POSTULACION = (
    "Pendiente de revisión",
    "Pre-seleccionado",
    "Etapa de entrevista",
    "En lista de espera",
    "Seleccionado",
    "No seleccionado",
)
ESTADO_DECLINADA = "Declinada por usuario"

ESTADOS_CONFIRMACION = ("Pendiente", "Confirmado", "No confirmado")
VALORES_ASISTENCIA = ("SI", "No", "No aplica")

ESTADOS_DOC_ACADEMIA = ("pendiente", "aprobado", "rechazado")
CATEGORIAS_ACADEMIA = ("guias_manuales", "plantillas_formatos", "videos_tutoriales")

ESTADOS_NOTICIA = ("activa", "inactiva", "borrador")
ESTADOS_SOLICITUD = ("pendiente", "aprobada", "rechazada")


def rechazo_participacion(p) -> bool:
    """El postulante retiró su postulación o, siendo seleccionado, indicó que no participará."""
    return p.estado == ESTADO_DECLINADA or (p.estado == "Seleccionado" and p.estado_confirmacion == "No confirmado")


def voluntariado_terminado(op) -> bool:
    """Terminado si ya llegó la fecha de fin; sin fecha de fin, cuando la oportunidad está cerrada."""
    if op is None:
        return False
    if op.fecha_fin_voluntariado:
        return op.fecha_fin_voluntariado <= date.today()
    return op.estado == "cerrada"


def puede_certificar_y_evaluar(p, op) -> bool:
    """Certificado y evaluaciones: solo seleccionados que participan, con el voluntariado terminado."""
    return p.estado == "Seleccionado" and not rechazo_participacion(p) and voluntariado_terminado(op)


def limpiar_rut(rut: str | None) -> str | None:
    value = (rut or "").strip().upper().replace(".", "").replace("-", "")
    return value or None
