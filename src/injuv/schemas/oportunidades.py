from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

EstadoOportunidad = Literal["activa", "abierta", "cerrada"]


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
    responsable_nombre: str | None = Field(default=None, max_length=50)
    responsable_apellido: str | None = Field(default=None, max_length=50)
    responsable_email: EmailStr | None = None
    responsable_email_institucional: EmailStr | None = None
    responsable_telefono: str | None = Field(default=None, max_length=30)

    @field_validator("*", mode="before")
    @classmethod
    def _empty_to_none(cls, v: object) -> object:
        if isinstance(v, str):
            v = v.strip()
            return v or None
        return v

    @model_validator(mode="after")
    def _fechas(self) -> "OportunidadBody":
        if self.fecha_inicio_voluntariado and self.fecha_fin_voluntariado:
            if self.fecha_inicio_voluntariado > self.fecha_fin_voluntariado:
                raise ValueError("La fecha de inicio debe ser anterior a la fecha de fin")
        return self


class EstadoOportunidadBody(BaseModel):
    estado: EstadoOportunidad


class CorreoMasivoBody(BaseModel):
    asunto: str = Field(min_length=1, max_length=200)
    mensaje: str = Field(min_length=1, max_length=5000)
    filtro_estado: str = "todos"
