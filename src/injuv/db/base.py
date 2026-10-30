"""
Base declarativa SQLAlchemy.

Todos los modelos ORM heredan de `Base`. Las tablas ya existen en PostgreSQL
(usuarios, organizaciones, oportunidades, postulaciones…): los modelos deben
reflejar ese esquema, no crearlo.
"""
from __future__ import annotations

from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
