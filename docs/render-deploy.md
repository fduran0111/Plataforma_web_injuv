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

## Archivos subidos en Cloudflare R2

El disco de Render es efímero: sin R2, las fotos y documentos subidos se pierden en cada deploy.
La API usa R2 automáticamente cuando están las variables `R2_*` (ver `src/injuv/services/files.py`).

| Bucket | Acceso | Carpetas |
|---|---|---|
| `injuv-publico` | Público (CDN) | `perfiles_usuarios`, `logos_organizaciones`, `imagenes_noticias`, `portada_fotos` |
| `injuv-privado` | Privado (solo vía API) | certificados, documentos de biblioteca y academia |

1. Cloudflare → **R2** → crear buckets `injuv-publico` e `injuv-privado`.
2. `injuv-publico` → **Settings → Public access → R2.dev subdomain → Allow**. Copiar la URL `https://pub-….r2.dev` (o conectar un dominio propio).
3. R2 → **Manage API tokens → Create API token** → permiso *Object Read & Write* para ambos buckets. Guardar *Access Key ID* y *Secret Access Key* (se muestran una sola vez).
4. En Render → Environment: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=injuv-privado`, `R2_PUBLIC_BUCKET=injuv-publico`, `R2_PUBLIC_URL=https://pub-….r2.dev`.
5. Migrar lo existente desde `storage/`: `.venv\Scripts\python scripts\migrar_storage_r2.py` (simula) y luego con `--subir`.

## Correo saliente (SMTP)

La API envía correos por SMTP (`src/injuv/services/mailer.py`): aviso de postulación recibida,
cambio de estado, cambio de fechas, cierre de convocatoria, correo masivo de la organización
y envío de certificados en PDF.

> **Ojo:** los servicios **Free** de Render bloquean el tráfico saliente a los puertos
> `25`, `465` y `587`. Se necesita un plan pagado (o un relay SMTP en el puerto `2525`,
> cambiando `MAIL_PORT`).

| Variable | Notas |
|----------|--------|
| `MAIL_SERVER` | Host SMTP (`smtp.gmail.com` para Gmail) |
| `MAIL_PORT` | `587` con STARTTLS, o `465` con `MAIL_USE_SSL=true` |
| `MAIL_USE_TLS` | `true` |
| `MAIL_USERNAME` | Cuenta remitente |
| `MAIL_PASSWORD` | En Gmail: **contraseña de aplicación** (no la normal); se genera en myaccount.google.com → Seguridad → Verificación en 2 pasos → Contraseñas de aplicaciones |
| `MAIL_DEFAULT_SENDER` | Opcional; por defecto se usa `MAIL_USERNAME` |

Todos los correos salen desde esta cuenta. Los que envía una organización aparecen como
"Nombre de la organización vía INJUV", van firmados por ella y tienen `Reply-To` apuntando a su
**correo de contacto** (`email_contacto`, editable en su perfil): las respuestas de los voluntarios
le llegan directo a la organización. Si la organización no tiene correo de contacto, no se agrega `Reply-To`.

Sin `MAIL_USERNAME` configurado los envíos se omiten y solo quedan en el log; el correo
masivo y el envío de certificados responden `503`. Para comprobar el envío: subir un
certificado y usar `POST /postulaciones/{id}/enviar-certificado`, o revisar los logs de
Render tras una postulación.
