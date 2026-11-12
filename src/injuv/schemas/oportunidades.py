from __future__ import annotations

import secrets
from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

EstadoOportunidad = Literal["activa", "abierta", "cerrada"]
TipoPregunta = Literal["si_no", "alternativas", "texto"]


class UbicacionItem(BaseModel):
    """Una ubicación del voluntariado (provincia se guarda en el campo `ciudad`)."""

    region: str | None = Field(default=None, max_length=255)
    ciudad: str | None = Field(default=None, max_length=255)
    comuna: str | None = Field(default=None, max_length=255)

    @field_validator("*", mode="before")
    @classmethod
    def _empty_to_none(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _con_region(self) -> "UbicacionItem":
        if not self.region:
            raise ValueError("Cada ubicación debe indicar al menos la región")
        return self


class PreguntaItem(BaseModel):
    """Pregunta que la organización define y el postulante responde al postular."""

    id: str = Field(default_factory=lambda: secrets.token_hex(3), max_length=16)
    texto: str = Field(min_length=3, max_length=300)
    tipo: TipoPregunta = "si_no"
    opciones: list[str] = Field(default_factory=list, max_length=10)
    obligatoria: bool = True

    @field_validator("texto", mode="before")
    @classmethod
    def _strip(cls, v: object) -> object:
        return v.strip() if isinstance(v, str) else v

    @field_validator("opciones", mode="before")
    @classmethod
    def _opciones_limpias(cls, v: object) -> object:
        if isinstance(v, list):
            return [o.strip()[:100] for o in v if isinstance(o, str) and o.strip()]
        return v

    @model_validator(mode="after")
    def _coherente(self) -> "PreguntaItem":
        if self.tipo == "alternativas" and len(self.opciones) < 2:
            raise ValueError("Las preguntas de alternativas necesitan al menos 2 opciones")
        if self.tipo != "alternativas":
            self.opciones = []
        return self


class PostularBody(BaseModel):
    """Respuestas del postulante a las preguntas de la convocatoria: {"<id pregunta>": "respuesta"}."""

    respuestas: dict[str, str] = Field(default_factory=dict, max_length=20)


def validar_periodo(limite: date | None, inicio: date | None, fin: date | None) -> None:
    """Coherencia entre cierre de postulaciones, inicio y término del voluntariado."""
    if inicio and fin and inicio > fin:
        raise ValueError("La fecha de término no puede ser anterior a la fecha de inicio")
    if limite and inicio and limite > inicio:
        raise ValueError("El voluntariado no puede comenzar antes del cierre de postulaciones")
    if limite and fin and limite > fin:
        raise ValueError("El cierre de postulaciones no puede ser posterior al término del voluntariado")


class FechasBody(BaseModel):
    """Modificar o aplazar las fechas de una oportunidad ya publicada."""

    fecha_limite_postulacion: date | None = None
    fecha_inicio_voluntariado: date | None = None
    fecha_fin_voluntariado: date | None = None
    motivo: str | None = Field(default=None, max_length=500)

    @field_validator("*", mode="before")
    @classmethod
    def _empty_to_none(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _fechas(self) -> "FechasBody":
        validar_periodo(self.fecha_limite_postulacion, self.fecha_inicio_voluntariado, self.fecha_fin_voluntariado)
        return self


class OportunidadBody(BaseModel):
    titulo: str = Field(min_length=3, max_length=200)
    descripcion: str = Field(min_length=10, max_length=500)
    tipo_de_voluntariado: str | None = Field(default=None, max_length=100)
    meta_postulantes: int | None = Field(default=None, ge=1)
    cupo_maximo: int | None = Field(default=None, ge=1)
    horas_voluntariado: int | None = Field(default=None, ge=0)
    fecha_limite_postulacion: date | None = None
    fecha_inicio_voluntariado: date | None = None
    fecha_fin_voluntariado: date | None = None
    region: str | None = Field(default=None, max_length=255)
    ciudad: str | None = Field(default=None, max_length=255)
    comuna: str | None = Field(default=None, max_length=255)
    # Ubicaciones extra (la principal sigue en region/ciudad/comuna y se repite como primera de la lista).
    ubicaciones: list[UbicacionItem] = Field(default_factory=list, max_length=10)
    preguntas: list[PreguntaItem] = Field(default_factory=list, max_length=10)
    responsable_nombre: str | None = Field(default=None, max_length=50)
    responsable_apellido: str | None = Field(default=None, max_length=50)
    responsable_email: EmailStr | None = None
    responsable_email_institucional: EmailStr | None = None
    responsable_telefono: str | None = Field(default=None, max_length=30)
    encargados_ids: list[int] = Field(default_factory=list, max_length=20)

    @field_validator("*", mode="before")
    @classmethod
    def _empty_to_none(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _fechas(self) -> "OportunidadBody":
        validar_periodo(self.fecha_limite_postulacion, self.fecha_inicio_voluntariado, self.fecha_fin_voluntariado)
        return self


class EstadoOportunidadBody(BaseModel):
    estado: EstadoOportunidad


class CorreoMasivoBody(BaseModel):
    asunto: str = Field(min_length=1, max_length=200)
    mensaje: str = Field(min_length=1, max_length=5000)
    filtro_estado: str = "todos"
