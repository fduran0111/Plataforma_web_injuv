/**
 * Cliente HTTP para la API FastAPI.
 *
 * - `NEXT_PUBLIC_API_URL`: URL base del backend (ej. http://127.0.0.1:8000).
 *   Defínela en `frontend-react/.env.local` (no subas ese archivo a git).
 * - El backend debe permitir el origen del Next.js en `CORS_ORIGINS`.
 */

/** Clave donde se guarda el JWT tras login (localStorage o sessionStorage). */
export const AUTH_TOKEN_STORAGE_KEY = "injuv_access_token";

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : "http://127.0.0.1:8000";
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) ??
    window.sessionStorage.getItem(AUTH_TOKEN_STORAGE_KEY)
  );
}

export function storeToken(token: string, remember: boolean): void {
  clearToken();
  (remember ? window.localStorage : window.sessionStorage).setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

export function clearToken(): void {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type ValidationItem = { loc?: (string | number)[]; msg?: string };

function errorMessage(status: number, body: unknown): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0] as ValidationItem;
    const field = first.loc?.filter((p) => p !== "body").join(".");
    const msg = (first.msg ?? "Dato inválido").replace(/^Value error, /, "");
    return field ? `${field}: ${msg}` : msg;
  }
  if (status === 0) return "No se pudo conectar con el servidor";
  return `Error ${status}`;
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getStoredToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let res: Response;
  try {
    res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, errorMessage(0, null));
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    if (res.status === 401 && token && typeof window !== "undefined") {
      window.dispatchEvent(new Event("injuv:unauthorized"));
    }
    throw new ApiError(res.status, errorMessage(res.status, body));
  }
  return res;
}

/** Petición JSON. `body` puede ser un objeto (se serializa) o `FormData` (multipart). */
export async function apiFetch<T>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const { body, ...init } = options;
  const res = await request(path, {
    ...init,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  return (res.status === 204 ? undefined : await res.json()) as T;
}

/** Descarga autenticada: obtiene el archivo como blob y dispara la descarga en el navegador. */
export async function downloadFile(path: string, fallbackName = "archivo"): Promise<void> {
  const res = await request(path);
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/i.exec(disposition);
  const name = match ? decodeURIComponent(match[1] ?? match[2]) : fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** URLs públicas de archivos (imágenes) servidos por la API. */
export const fileUrl = {
  foto: (userId: number, version?: string | null) =>
    `${getApiBaseUrl()}/usuarios/${userId}/foto${version ? `?v=${encodeURIComponent(version)}` : ""}`,
  logo: (orgId: number, version?: string | null) =>
    `${getApiBaseUrl()}/organizaciones/${orgId}/logo${version ? `?v=${encodeURIComponent(version)}` : ""}`,
  noticia: (filename: string) => `${getApiBaseUrl()}/noticias/imagen/${encodeURIComponent(filename)}`,
  documento: (seccion: string, id: number) => `${getApiBaseUrl()}/repositorio/${seccion}/${id}/descargar`,
  portada: (archivo: string) => `${getApiBaseUrl()}/portada/foto/${encodeURIComponent(archivo)}`,
  oportunidad: (id: number, version?: string | null) =>
    `${getApiBaseUrl()}/oportunidades/${id}/imagen${version ? `?v=${encodeURIComponent(version)}` : ""}`,
  certificacionOrg: (orgId: number, archivo: string) =>
    `${getApiBaseUrl()}/organizaciones/${orgId}/certificaciones/${encodeURIComponent(archivo)}`,
};
