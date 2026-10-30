# AGENTS.md

Estructura y tecnologías basadas en el proyecto de referencia SistemaDossier (ver `docs/estructura.md`).

## Stack
- API: FastAPI + SQLAlchemy 2 + psycopg3 + PyJWT/bcrypt, paquete `src/injuv/`, arranque `main.py`.
- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind 4 en `frontend-react/`.
- Legado en migración: `backend/` (Flask, puerto 5500) y `template/` (HTML/JS). No borrar hasta migrar cada módulo.
- La base PostgreSQL existente (`INJUV`) se mantiene: los modelos mapean tablas existentes, no se crean tablas.

## Comandos
- API: `.venv\Scripts\python main.py` (http://127.0.0.1:8000, `/health`, `/db/health`, `/docs`). Requiere `.env` (ver `.env.example`; `JWT_SECRET` ≥ 32 caracteres).
- Frontend: en `frontend-react/`: `npm run dev`, verificación `npm run lint` y `npm run build`.
