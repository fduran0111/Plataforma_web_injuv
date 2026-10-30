"""Valores válidos de estados y categorías usados por la plataforma."""
from __future__ import annotations

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


def limpiar_rut(rut: str | None) -> str | None:
    value = (rut or "").strip().upper().replace(".", "").replace("-", "")
    return value or None
