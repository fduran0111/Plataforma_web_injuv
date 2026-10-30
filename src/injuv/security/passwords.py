"""
Hash y verificación de contraseñas.

Las contraseñas nuevas se guardan con bcrypt. Las existentes en la tabla
`usuarios` fueron creadas con Werkzeug (`scrypt:` / `pbkdf2:`) y se siguen
aceptando para no obligar a resetear cuentas.
"""
from __future__ import annotations

import bcrypt
from werkzeug.security import check_password_hash


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(plain_password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    if password_hash.startswith("$2"):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), password_hash.encode("ascii"))
        except ValueError:
            return False
    return check_password_hash(password_hash, plain_password)


def needs_rehash(password_hash: str | None) -> bool:
    """True si el hash es legado (Werkzeug) y conviene regenerarlo con bcrypt tras un login válido."""
    return not (password_hash or "").startswith("$2")
