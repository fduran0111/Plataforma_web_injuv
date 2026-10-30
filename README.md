# INJUV

Plataforma de voluntariado del Instituto Nacional de la Juventud.

- **API:** FastAPI + SQLAlchemy 2 + PostgreSQL (psycopg3), JWT — código en `src/injuv/`.
- **Frontend:** Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 — en `frontend-react/`.
- **Despliegue:** API en Render, frontend en Vercel.

> En migración: `backend/` (Flask) y `template/` (HTML/JS) siguen siendo la versión en uso y se retiran módulo a módulo. Ver [docs/estructura.md](docs/estructura.md).

## Estructura

| Ruta | Rol |
|------|-----|
| `main.py` | Arranque de la API (uvicorn). |
| `src/injuv/` | Paquete Python: `api/`, `services/`, `db/`, `schemas/`, `security/`, `config.py`. |
| `frontend-react/` | Aplicación Next.js. |
| `storage/` | Archivos subidos (fotos, logos, PDFs, certificados…). |
| `docs/` | Estructura y guías de despliegue. |
| `backend/`, `template/` | Versión legada (Flask + HTML). |

## Desarrollo local

### API

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env   # completar DATABASE_URL y JWT_SECRET
python main.py           # http://127.0.0.1:8000  (docs en /docs)
```

### Frontend

```powershell
cd frontend-react
copy .env.local.example .env.local
npm install
npm run dev              # http://localhost:3000
```

### Versión legada (mientras dure la migración)

```powershell
pip install -r backend/requirements.txt
cd backend/src
python app.py            # http://127.0.0.1:5500
```

## Despliegue

- API: [docs/render-deploy.md](docs/render-deploy.md)
- Frontend: [docs/vercel-frontend.md](docs/vercel-frontend.md)
