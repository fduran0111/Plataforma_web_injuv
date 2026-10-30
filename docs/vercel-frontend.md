# Desplegar el frontend (Next.js) en Vercel

El backend FastAPI va en otro servicio ([render-deploy.md](render-deploy.md)). Vercel solo construye **`frontend-react`**.

## Checklist en Vercel

1. **Settings → Build and Deployment**
   - **Root Directory:** `frontend-react`
   - **Framework Preset:** Next.js
   - **Include files outside the root directory in the Build Step:** OFF
     (evita que Vercel detecte el proyecto como Python por `requirements.txt` / `main.py` en la raíz).

2. **Settings → Environment Variables**
   - `NEXT_PUBLIC_API_URL` = URL HTTPS de la API, p. ej. `https://injuv-api.onrender.com` (sin barra final).

3. **Backend: `CORS_ORIGINS`** debe incluir el dominio de Vercel, p. ej.
   `https://injuv.vercel.app,http://localhost:3000`.
   Las previews `*.vercel.app` se aceptan por defecto (`CORS_ALLOW_VERCEL_APP_REGEX=1`).

4. Tras cambiar variables, hacer un nuevo despliegue: `NEXT_PUBLIC_*` se incrustan en el build.

## `frontend-react/vercel.json`

Fija Next.js y `npm install` / `npm run build` para evitar ambigüedad en el monorepo.
