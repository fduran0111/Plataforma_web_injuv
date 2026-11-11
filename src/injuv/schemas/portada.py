"""Portada editable: cuerpos de petición del panel de administración."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


def _limpio(v: object) -> object:
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class PortadaConfigBody(BaseModel):
    etiqueta: str | None = Field(default=None, max_length=120)
    titulo_linea1: str | None = Field(default=None, max_length=80)
    titulo_linea2: str | None = Field(default=None, max_length=80)
    titulo_resaltado: str | None = Field(default=None, max_length=80)
    subtitulo: str | None = Field(default=None, max_length=300)
    aviso_activo: bool = False
    aviso_texto: str | None = Field(default=None, max_length=200)
    aviso_enlace: str | None = Field(default=None, max_length=300)

    @field_validator("*", mode="before")
    @classmethod
    def vacio_a_none(cls, v: object) -> object:
        return _limpio(v)

    @field_validator("aviso_enlace")
    @classmethod
    def enlace_valido(cls, v: str | None) -> str | None:
        if v is not None and not (v.startswith("/") or v.startswith("https://")):
            raise ValueError("El enlace del aviso debe empezar con '/' o 'https://'")
        return v

    @model_validator(mode="after")
    def aviso_requiere_texto(self) -> PortadaConfigBody:
        if self.aviso_activo and not self.aviso_texto:
            raise ValueError("Para activar el aviso debes indicar su texto")
        return self


class PortadaFotoPatch(BaseModel):
    alt: str | None = Field(default=None, min_length=3, max_length=200)
    activa: bool | None = None

    @field_validator("alt", mode="before")
    @classmethod
    def limpia_alt(cls, v: object) -> object:
        return _limpio(v)


class PortadaOrdenBody(BaseModel):
    seccion: Literal["inicio", "galeria"]
    ids: list[int] = Field(min_length=1)
