from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

EstadoPostulacion = Literal[
    "Pendiente de revisión",
    "Pre-seleccionado",
    "Etapa de entrevista",
    "En lista de espera",
    "Seleccionado",
    "No seleccionado",
]
Asistencia = Literal["SI", "No", "No aplica"]


class EstadoPostulacionBody(BaseModel):
    estado: EstadoPostulacion
    motivo_no_seleccion: str | None = Field(default=None, max_length=255)
    motivo_no_seleccion_otro: str | None = Field(default=None, max_length=2000)


class AsistenciaBody(BaseModel):
    asistencia_capacitacion: Asistencia | None = None
    asistencia_actividad: Asistencia | None = None
    horas_voluntariado: int | None = Field(default=None, ge=0, le=10000)


class ConfirmacionBody(BaseModel):
    estado_confirmacion: Literal["Confirmado", "No confirmado"]


class ResenaOrgBody(BaseModel):
    """Reseña de la organización sobre el voluntario."""

    resena: str | None = Field(default=None, max_length=2000)
    calificacion: float | None = Field(default=None, ge=0, le=5)
    es_publica: bool = False


class ResenaUsuarioBody(BaseModel):
    """Reseña del voluntario sobre la organización."""

    resena: str = Field(min_length=3, max_length=2000)
    calificacion: float = Field(ge=1, le=5)
    es_publica: bool = True


class VisibilidadBody(BaseModel):
    es_publica: bool


class EnviarCertificadoBody(BaseModel):
    email: str | None = None
