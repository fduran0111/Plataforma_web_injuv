# Estructura del repositorio INJUV

Objetivo: **código Python bajo `src/injuv/`**, raíz solo con configuración y arranque; frontend en **`frontend-react/`** (Next.js).

```
PLATAFORMA_WEB_INJUV/
├── main.py                 # Arranque: carga .env y uvicorn (importa injuv.api.app)
├── requirements.txt
├── .env                    # Local (no git) — plantilla: .env.example
├── render.yaml             # Blueprint de la API en Render
│
├── src/injuv/              # Paquete principal (FastAPI)
│   ├── api/                # Routers HTTP (auth, usuarios, organizaciones, oportunidades…)
│   ├── services/           # Lógica de negocio
│   ├── db/                 # SQLAlchemy: conexión, sesión, modelos de las tablas existentes
│   ├── schemas/            # Pydantic (entrada/salida)
│   ├── security/           # JWT, contraseñas (bcrypt + compatibilidad Werkzeug), roles
│   └── config.py           # Rutas del proyecto, .env, carpeta storage/
│
├── frontend-react/         # Next.js 16 + React 19 + TypeScript + Tailwind 4
│   └── src/
│       ├── app/            # Rutas (App Router)
│       ├── components/     # Componentes reutilizables
│       └── lib/            # Cliente de la API, utilidades
│
├── storage/                # Archivos subidos (fotos, logos, PDFs…) — gitignored
├── docs/                   # Guías de estructura y despliegue
│
├── backend/                # LEGADO: API Flask (se retira al migrar cada módulo)
└── template/               # LEGADO: frontend HTML/JS (se retira al migrar cada sección)
```

## Cómo se importa

- Desde la raíz: `python main.py` añade `src/` a `sys.path`.
- Alternativa: `$env:PYTHONPATH="src"` y `uvicorn injuv.api.app:app --reload`.

## Migración desde la versión Flask

1. Mapear las tablas del módulo en `src/injuv/db/models.py` (el esquema de PostgreSQL **no cambia**).
2. Crear `schemas/<modulo>.py`, `services/<modulo>.py` y `api/<modulo>_routes.py` (`APIRouter`), e incluir el router en `api/app.py`.
3. Crear las páginas en `frontend-react/src/app/...` consumiendo la API con `apiFetch`.
4. Eliminar las rutas equivalentes de `backend/src/app.py` y las páginas de `template/`.

## Despliegue

| Pieza | Documentación |
|-------|----------------|
| API (Render) | [render-deploy.md](render-deploy.md) |
| Frontend (Vercel) | [vercel-frontend.md](vercel-frontend.md) |
