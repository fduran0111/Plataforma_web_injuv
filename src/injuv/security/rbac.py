"""Roles de la plataforma (columna `usuarios.rol`)."""
from __future__ import annotations

from typing import Literal

Role = Literal["user", "organizacion", "admin"]

ALLOWED_ROLES: frozenset[str] = frozenset({"user", "organizacion", "admin"})


def normalize_role(role: str | None) -> Role:
    raw = (role or "user").strip().lower()
    return raw if raw in ALLOWED_ROLES else "user"  # type: ignore[return-value]


def is_admin(role: str | None) -> bool:
    return normalize_role(role) == "admin"


def can_manage_opportunities(role: str | None) -> bool:
    return normalize_role(role) in ("organizacion", "admin")
