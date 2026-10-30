"""Rutas del proyecto, .env y carpeta de archivos subidos."""
from __future__ import annotations

from pathlib import Path

PACKAGE_ROOT = Path(__file__).resolve().parent
SRC_ROOT = PACKAGE_ROOT.parent
PROJECT_ROOT = SRC_ROOT.parent

STORAGE_DIR = PROJECT_ROOT / "storage"
DOCS_DIR = PROJECT_ROOT / "docs"


def load_env() -> None:
    from dotenv import load_dotenv

    load_dotenv(PROJECT_ROOT / ".env")


def storage_path(*parts: str) -> Path:
    """Ruta dentro de `storage/` (crea la carpeta padre si no existe)."""
    path = STORAGE_DIR.joinpath(*parts)
    path.parent.mkdir(parents=True, exist_ok=True)
    return path
