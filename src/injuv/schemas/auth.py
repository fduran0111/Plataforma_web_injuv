from __future__ import annotations

from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator

from injuv.services.catalogo import limpiar_rut


def rut_valido(rut: str) -> bool:
    """Valida un RUT chileno limpio (sin puntos ni guion) con su dígito verificador."""
    if len(rut) < 8 or len(rut) > 9 or not rut[:-1].isdigit():
        return False
    total, factor = 0, 2
    for digit in reversed(rut[:-1]):
        total += int(digit) * factor
        factor = 2 if factor == 7 else factor + 1
    dv = 11 - total % 11
    esperado = {11: "0", 10: "K"}.get(dv, str(dv))
    return rut[-1] == esperado


class RegisterBody(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    apellido: str = Field(min_length=1, max_length=100)
    email: EmailStr
    rut: str
    fecha_nacimiento: date
    password: str = Field(min_length=8, max_length=128)

    @field_validator("nombre", "apellido")
    @classmethod
    def _strip(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Campo requerido")
        return v

    @field_validator("rut")
    @classmethod
    def _rut(cls, v: str) -> str:
        rut = limpiar_rut(v) or ""
        if not rut_valido(rut):
            raise ValueError("RUT inválido")
        return rut

    @field_validator("fecha_nacimiento")
    @classmethod
    def _edad(cls, v: date) -> date:
        hoy = date.today()
        edad = hoy.year - v.year - ((hoy.month, hoy.day) < (v.month, v.day))
        if edad < 15:
            raise ValueError("Debes tener al menos 15 años para registrarte")
        if edad > 120:
            raise ValueError("Fecha de nacimiento inválida")
        return v


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class ChangePasswordBody(BaseModel):
    password_actual: str
    password_nueva: str = Field(min_length=8, max_length=128)
