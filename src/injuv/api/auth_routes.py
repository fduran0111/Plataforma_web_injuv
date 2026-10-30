"""Registro, inicio de sesión y perfil de la sesión actual (JWT)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select

from injuv.api.deps import CurrentUser, DbSession
from injuv.db.models import Organizacion, Usuario
from injuv.schemas.auth import ChangePasswordBody, LoginBody, RegisterBody
from injuv.security.jwt_tokens import create_access_token
from injuv.security.passwords import hash_password, needs_rehash, verify_password
from injuv.security.rbac import normalize_role
from injuv.services import serializers

router = APIRouter(prefix="/auth", tags=["Auth"])


def session_payload(db: DbSession, user: Usuario) -> dict[str, Any]:
    org = db.scalar(select(Organizacion).where(Organizacion.id_usuario_org == user.id))
    data = serializers.usuario(user)
    data["organizacion"] = {"id": org.id, "nombre": org.nombre} if org else None
    return data


def _token_response(db: DbSession, user: Usuario) -> dict[str, Any]:
    token = create_access_token(user_id=user.id, email=user.email or "", role=normalize_role(user.rol))
    return {"access_token": token, "token_type": "bearer", "user": session_payload(db, user)}


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(body: RegisterBody, db: DbSession) -> dict[str, Any]:
    email = body.email.lower()
    if db.scalar(select(Usuario.id).where(func.lower(Usuario.email) == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "El email ya está registrado")
    if db.scalar(select(Usuario.id).where(Usuario.rut == body.rut)):
        raise HTTPException(status.HTTP_409_CONFLICT, "El RUT ya está registrado")
    user = Usuario(
        nombre=body.nombre,
        apellido=body.apellido,
        email=email,
        rut=body.rut,
        fecha_nacimiento=body.fecha_nacimiento,
        password_hash=hash_password(body.password),
        rol="user",
        hora_voluntariado=0,
        certificado_voluntariado=[],
        certificado_personales=[],
        created_at=datetime.now(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _token_response(db, user)


@router.post("/login")
def login(body: LoginBody, db: DbSession) -> dict[str, Any]:
    user = db.scalar(select(Usuario).where(func.lower(Usuario.email) == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Email o contraseña incorrectos")
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(body.password)
        db.commit()
    return _token_response(db, user)


@router.get("/me")
def me(user: CurrentUser, db: DbSession) -> dict[str, Any]:
    return session_payload(db, user)


@router.put("/password")
def change_password(body: ChangePasswordBody, user: CurrentUser, db: DbSession) -> dict[str, str]:
    if not verify_password(body.password_actual, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La contraseña actual no es correcta")
    user.password_hash = hash_password(body.password_nueva)
    db.commit()
    return {"message": "Contraseña actualizada"}
