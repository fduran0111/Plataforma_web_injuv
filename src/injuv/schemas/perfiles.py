from __future__ import annotations

from datetime import date

from pydantic import BaseModel, EmailStr, Field, HttpUrl, field_validator


def _clean(v: object) -> object:
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class PerfilUsuarioBody(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    email: EmailStr
    telefono: str | None = Field(default=None, max_length=20)
    region: str | None = Field(default=None, max_length=100)
    ciudad: str | None = Field(default=None, max_length=100)
    comuna: str | None = Field(default=None, max_length=100)
    sexo: str | None = Field(default=None, max_length=100)
    fecha_nacimiento: date | None = None

    _strip = field_validator("*", mode="before")(classmethod(lambda cls, v: _clean(v)))


class EliminarCuentaBody(BaseModel):
    password: str


class OrganizacionBody(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    siglas_nombre: str | None = Field(default=None, max_length=100)
    email_contacto: EmailStr | None = None
    telefono_contacto: str | None = Field(default=None, max_length=20)
    region: str | None = Field(default=None, max_length=100)
    ciudad: str | None = Field(default=None, max_length=100)
    comuna: str | None = Field(default=None, max_length=100)
    descripcion: str | None = Field(default=None, max_length=5000)
    descripcion_breve: str | None = Field(default=None, max_length=500)
    area_trabajo: str | None = Field(default=None, max_length=100)
    tipo_org: str | None = Field(default=None, max_length=100)
    sitio_web: str | None = Field(default=None, max_length=500)
    redes_sociales: list[str] = Field(default_factory=list, max_length=10)
    experiencia_anios: int | None = Field(default=None, ge=0, le=200)
    voluntarios_anuales: str | None = Field(default=None, max_length=100)

    _strip = field_validator(
        "nombre", "siglas_nombre", "email_contacto", "telefono_contacto", "region", "ciudad", "comuna",
        "descripcion", "descripcion_breve", "area_trabajo", "tipo_org", "sitio_web", "voluntarios_anuales",
        mode="before",
    )(classmethod(lambda cls, v: _clean(v)))

    @field_validator("redes_sociales")
    @classmethod
    def _redes(cls, v: list[str]) -> list[str]:
        return [r.strip() for r in v if r and r.strip()]


class SolicitudOrganizacionBody(BaseModel):
    nombre: str = Field(min_length=2, max_length=150)
    rut: str | None = Field(default=None, max_length=20)
    fecha_creacion: date
    region: str = Field(min_length=1, max_length=100)
    ciudad: str = Field(min_length=1, max_length=100)
    comuna: str = Field(min_length=1, max_length=100)
    descripcion: str = Field(min_length=20, max_length=5000)
    sitio_web: HttpUrl | None = None
    redes_sociales: list[str] = Field(default_factory=list, max_length=10)

    _strip = field_validator("rut", "sitio_web", mode="before")(classmethod(lambda cls, v: _clean(v)))


class MiembroBody(BaseModel):
    email: EmailStr
