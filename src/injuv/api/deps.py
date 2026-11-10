"""Dependencias FastAPI: sesión de BD, usuario autenticado y control de roles."""
from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jwt.exceptions import PyJWTError
from sqlalchemy import select
from sqlalchemy.orm import Session

from injuv.db import get_db
from injuv.db.models import Organizacion, Usuario
from injuv.security.jwt_tokens import decode_access_token
from injuv.security.rbac import normalize_role

DbSession = Annotated[Session, Depends(get_db)]


def _user_from_header(db: Session, authorization: str | None) -> Usuario | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        payload = decode_access_token(authorization.split(" ", 1)[1].strip())
        user_id = int(payload["sub"])
    except (PyJWTError, KeyError, ValueError):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesión inválida o expirada")
    user = db.get(Usuario, user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no encontrado")
    return user


def get_current_user(db: DbSession, authorization: Annotated[str | None, Header()] = None) -> Usuario:
    user = _user_from_header(db, authorization)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Debes iniciar sesión")
    return user


def get_optional_user(db: DbSession, authorization: Annotated[str | None, Header()] = None) -> Usuario | None:
    try:
        return _user_from_header(db, authorization)
    except HTTPException:
        return None


CurrentUser = Annotated[Usuario, Depends(get_current_user)]
OptionalUser = Annotated[Usuario | None, Depends(get_optional_user)]


def require_roles(*roles: str) -> Callable[[Usuario], Usuario]:
    def checker(user: CurrentUser) -> Usuario:
        if normalize_role(user.rol) not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No tienes permisos para esta acción")
        return user

    return checker


AdminUser = Annotated[Usuario, Depends(require_roles("admin"))]


def get_own_organization(db: DbSession, user: CurrentUser) -> Organizacion:
    """Organización administrada por el usuario actual (rol organizacion o admin)."""
    org = db.scalar(select(Organizacion).where(Organizacion.id_usuario_org == user.id))
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No administras ninguna organización")
    return org


OwnOrganization = Annotated[Organizacion, Depends(get_own_organization)]


def organizacion_de_usuario(db: Session, user: Usuario) -> tuple[Organizacion | None, str | None]:
    """Organización del usuario y su rol en ella: 'admin' (dueño) o 'miembro' (afiliado)."""
    org = db.scalar(select(Organizacion).where(Organizacion.id_usuario_org == user.id))
    if org:
        return org, "admin"
    if user.organizacion_afiliada:
        org = db.get(Organizacion, user.organizacion_afiliada)
        if org:
            return org, "miembro"
    return None, None


def get_member_organization(db: DbSession, user: CurrentUser) -> Organizacion:
    """Organización a la que pertenece el usuario, como administrador o como miembro."""
    org, _ = organizacion_de_usuario(db, user)
    if not org:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No perteneces a ninguna organización")
    return org


MemberOrganization = Annotated[Organizacion, Depends(get_member_organization)]
