"""Guardado y lectura de archivos subidos en `storage/` (mismas carpetas que la versión Flask)."""
from __future__ import annotations

import secrets
from datetime import datetime
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from injuv.config import STORAGE_DIR

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
DOC_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".odt", ".ods", ".odp"}
VIDEO_EXTS = {".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv", ".m4v"}
MB = 1024 * 1024


def folder_path(folder: str) -> Path:
    path = STORAGE_DIR / folder
    path.mkdir(parents=True, exist_ok=True)
    return path


async def save_upload(
    file: UploadFile,
    folder: str,
    prefix: str,
    allowed: set[str],
    max_mb: int,
) -> tuple[str, str | None, int]:
    """Guarda el archivo y devuelve (nombre_en_disco, mime, tamaño_bytes)."""
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
    (folder_path(folder) / name).write_bytes(data)
    return name, file.content_type, len(data)


def resolve(folder: str, filename: str | None) -> Path | None:
    """Ruta absoluta de un archivo guardado; acepta rutas legadas absolutas o `carpeta/archivo`."""
    if not filename:
        return None
    raw = Path(filename)
    if raw.is_absolute() and raw.is_file():
        return raw
    candidate = STORAGE_DIR / folder / raw.name
    return candidate if candidate.is_file() else None


def delete(folder: str, filename: str | None) -> None:
    path = resolve(folder, filename)
    if path:
        path.unlink(missing_ok=True)


def send(folder: str, filename: str | None, download_name: str | None = None) -> FileResponse:
    path = resolve(folder, filename)
    if not path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Archivo no encontrado")
    if download_name:
        return FileResponse(path, filename=download_name)
    return FileResponse(path)
