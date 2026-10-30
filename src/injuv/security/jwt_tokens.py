"""
JWT de acceso (HS256).

El token lleva el id de usuario (`sub`) y su rol; el cliente lo envía en
`Authorization: Bearer ...`. `JWT_SECRET` debe ser larga y aleatoria en
producción (nunca commitear en el repo).
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt


def _secret() -> str:
    secret = os.getenv("JWT_SECRET", "").strip()
    if len(secret) < 32:
        raise RuntimeError(
            "JWT_SECRET no está definida o es demasiado corta (mínimo 32 caracteres). "
            "Añádela en .env, p. ej.: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
        )
    return secret


def create_access_token(*, user_id: int, email: str, role: str) -> str:
    minutes = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "role": role.strip().lower(),
        "iat": now,
        "exp": now + timedelta(minutes=minutes),
    }
    return jwt.encode(payload, _secret(), algorithm="HS256")


def decode_access_token(token: str) -> dict[str, Any]:
    """Valida firma y expiración; lanza PyJWTError si el token es inválido."""
    return jwt.decode(token, _secret(), algorithms=["HS256"])
