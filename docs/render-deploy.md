# Desplegar la API en Render

| Pieza | Dónde |
|-------|--------|
| Frontend Next.js | Vercel ([vercel-frontend.md](vercel-frontend.md)) |
| API FastAPI | Render Web Service (plan Free se duerme sin tráfico) |
| PostgreSQL | Neon (free tier) u otro proveedor |

## Base de datos

1. Crear un proyecto PostgreSQL (p. ej. [Neon](https://neon.tech)) y copiar la connection string.
   La API la convierte sola a `postgresql+psycopg://` (ver `src/injuv/db/settings.py`).
2. Importar el esquema y los datos actuales con `pg_dump` / `pg_restore` desde la base local `INJUV`,
   o ejecutar `backend/migrations/migracion_completa.sql` en una base vacía.

## API en Render

### Opción A — Blueprint (recomendada)

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → conectar el repo.
2. Render detecta `render.yaml` en la raíz.
3. En **Environment**, añadir las variables de abajo.

### Opción B — Manual

- **Runtime:** Python 3
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `uvicorn injuv.api.app:app --host 0.0.0.0 --port $PORT`
- **Environment:** `PYTHON_VERSION=3.12.8`, `PYTHONPATH=src`
- **Health check path:** `/health`

### Variables de entorno

| Variable | Notas |
|----------|--------|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `JWT_SECRET` | Mínimo 32 caracteres aleatorios (`python -c "import secrets; print(secrets.token_urlsafe(48))"`) |
| `CORS_ORIGINS` | URL(s) del frontend en Vercel + `http://localhost:3000` |
| `FRONTEND_URL` | URL del frontend (sin barra final) |

Comprobar tras el despliegue: `GET /health` y `GET /db/health`.

## Archivos subidos

El disco de Render es efímero: lo que se guarde en `storage/` se pierde en cada despliegue.
Para producción conviene usar un **Persistent Disk** de Render montado en `storage/` o un almacenamiento de objetos (S3, Cloudflare R2…).
