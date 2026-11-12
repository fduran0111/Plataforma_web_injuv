"""
Guardado y lectura de archivos subidos (fotos, logos, noticias, portada, certificados, documentos).

Dos modos, según las variables de entorno:
- **Cloudflare R2** (producción): si están `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
  y `R2_BUCKET`. Las imágenes públicas van a `R2_PUBLIC_BUCKET` y se sirven desde el CDN
  (`R2_PUBLIC_URL`); los documentos privados quedan en `R2_BUCKET` y solo se entregan a través
  de la API, que valida permisos.
- **Disco local** (desarrollo): carpeta `storage/`, como siempre.

En R2 la clave de cada objeto es `carpeta/archivo` (las mismas carpetas que `storage/`), así la
base de datos sigue guardando solo el nombre del archivo y no cambia nada al migrar.
"""
from __future__ import annotations

import mimetypes
import os
import secrets
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any
from urllib.parse import quote

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse, Response

from injuv.config import STORAGE_DIR

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
DOC_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".odt", ".ods", ".odp"}
VIDEO_EXTS = {".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv", ".m4v"}
MB = 1024 * 1024

# Imágenes que cualquiera puede ver: se sirven desde el CDN de Cloudflare sin pasar por la API.
PUBLIC_FOLDERS = {
    "perfiles_usuarios",
    "logos_organizaciones",
    "imagenes_noticias",
    "portada_fotos",
    "imagenes_oportunidades",
}

# Los nombres llevan fecha y un token aleatorio: nunca se reutilizan, se pueden cachear "para siempre".
_CACHE_PUBLICO = "public, max-age=31536000, immutable"


# ---------- Configuración de R2 ----------


def _env(nombre: str) -> str:
    return os.getenv(nombre, "").strip()


def r2_activo() -> bool:
    return all(_env(k) for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"))


@lru_cache(maxsize=1)
def _cliente() -> Any:
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"https://{_env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
        aws_access_key_id=_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_env("R2_SECRET_ACCESS_KEY"),
        region_name="auto",
        config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
    )


def _es_publica(folder: str) -> bool:
    return folder in PUBLIC_FOLDERS and bool(_env("R2_PUBLIC_BUCKET")) and bool(_env("R2_PUBLIC_URL"))


def _bucket(folder: str) -> str:
    return _env("R2_PUBLIC_BUCKET") if _es_publica(folder) else _env("R2_BUCKET")


def _key(folder: str, filename: str) -> str:
    # Acepta nombres legados con ruta ("carpeta/archivo" o rutas absolutas): solo vale el nombre.
    return f"{folder}/{Path(filename).name}"


def _mime(filename: str) -> str:
    return mimetypes.guess_type(filename)[0] or "application/octet-stream"


def url_publica(folder: str, filename: str) -> str | None:
    """URL del CDN para una imagen pública (solo en modo R2)."""
    if not (r2_activo() and _es_publica(folder)):
        return None
    return f"{_env('R2_PUBLIC_URL').rstrip('/')}/{quote(_key(folder, filename))}"


# ---------- Disco local ----------


def folder_path(folder: str) -> Path:
    path = STORAGE_DIR / folder
    path.mkdir(parents=True, exist_ok=True)
    return path


def resolve(folder: str, filename: str | None) -> Path | None:
    """Ruta absoluta de un archivo en disco local; acepta rutas legadas absolutas o `carpeta/archivo`."""
    if not filename:
        return None
    raw = Path(filename)
    if raw.is_absolute() and raw.is_file():
        return raw
    candidate = STORAGE_DIR / folder / raw.name
    return candidate if candidate.is_file() else None


# ---------- API común ----------


def guardar_bytes(folder: str, name: str, data: bytes, content_type: str | None = None) -> None:
    """Guarda `data` como `folder/name` en R2 o en disco."""
    if r2_activo():
        extra = {"CacheControl": _CACHE_PUBLICO} if _es_publica(folder) else {}
        _cliente().put_object(
            Bucket=_bucket(folder),
            Key=_key(folder, name),
            Body=data,
            ContentType=content_type or _mime(name),
            **extra,
        )
    else:
        (folder_path(folder) / name).write_bytes(data)


def leer_bytes(folder: str, filename: str | None) -> bytes | None:
    """Contenido de un archivo guardado, o None si no existe."""
    if not filename:
        return None
    if r2_activo():
        try:
            return _cliente().get_object(Bucket=_bucket(folder), Key=_key(folder, filename))["Body"].read()
        except Exception:  # noqa: BLE001 — NoSuchKey u otro error de R2: se trata como "no existe"
            return None
    path = resolve(folder, filename)
    return path.read_bytes() if path else None


async def save_upload(
    file: UploadFile,
    folder: str,
    prefix: str,
    allowed: set[str],
    max_mb: int,
) -> tuple[str, str | None, int]:
    """Valida y guarda el archivo; devuelve (nombre_guardado, mime, tamaño_bytes)."""
    ext = Path(file.filename or "").suffix.lower()
    if ext not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Tipo de archivo no permitido. Permitidos: {', '.join(sorted(allowed))}",
        )
    data = await file.read()
    if len(data) > max_mb * MB:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El archivo supera el máximo de {max_mb} MB")
    if not data:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "El archivo está vacío")
    name = f"{prefix}_{datetime.now():%Y%m%d_%H%M%S}_{secrets.token_hex(4)}{ext}"
    guardar_bytes(folder, name, data, file.content_type)
    return name, file.content_type, len(data)


def delete(folder: str, filename: str | None) -> None:
    if not filename:
        return
    if r2_activo():
        try:
            _cliente().delete_object(Bucket=_bucket(folder), Key=_key(folder, filename))
        except Exception:  # noqa: BLE001 — borrar un archivo que ya no está no debe romper la acción
            pass
        return
    path = resolve(folder, filename)
    if path:
        path.unlink(missing_ok=True)


def send(folder: str, filename: str | None, download_name: str | None = None) -> Response:
    """
    Respuesta HTTP con el archivo.
    - Imagen pública en R2: redirección al CDN (el navegador la descarga directo de Cloudflare).
    - Privado en R2: la API lo lee y lo entrega (los permisos ya se validaron en la ruta).
    - Disco local: FileResponse.
    """
    if not filename:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Archivo no encontrado")

    if r2_activo():
        cdn = url_publica(folder, filename)
        if cdn:
            return RedirectResponse(cdn, status_code=status.HTTP_307_TEMPORARY_REDIRECT, headers={"Cache-Control": "public, max-age=86400"})
        data = leer_bytes(folder, filename)
        if data is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Archivo no encontrado")
        headers = {"Cache-Control": "private, no-store"}
        if download_name:
            headers["Content-Disposition"] = f"attachment; filename*=utf-8''{quote(download_name)}"
        return Response(data, media_type=_mime(download_name or filename), headers=headers)

    path = resolve(folder, filename)
    if not path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Archivo no encontrado")
    headers = {"Cache-Control": "public, max-age=86400"} if folder in PUBLIC_FOLDERS else None
    if download_name:
        return FileResponse(path, filename=download_name, headers=headers)
    return FileResponse(path, headers=headers)
