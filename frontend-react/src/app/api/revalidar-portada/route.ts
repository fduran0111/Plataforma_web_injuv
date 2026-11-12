import { revalidatePath } from "next/cache";
import { getApiBaseUrl } from "@/lib/api";

/** Revalida la portada pública tras guardar cambios en el admin (solo admins, verificado vía /auth/me). */
export async function POST(req: Request) {
  const authorization = req.headers.get("Authorization");
  if (!authorization) return Response.json({ error: "No autorizado" }, { status: 401 });
  const res = await fetch(`${getApiBaseUrl()}/auth/me`, { headers: { Authorization: authorization }, cache: "no-store", signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!res?.ok) return Response.json({ error: "No autorizado" }, { status: 403 });
  const me = (await res.json().catch(() => null)) as { rol?: string; user?: { rol?: string } } | null;
  const rol = me?.rol ?? me?.user?.rol;
  if (rol !== "admin") return Response.json({ error: "No autorizado" }, { status: 403 });
  revalidatePath("/");
  revalidatePath("/login");
  revalidatePath("/registro");
  return Response.json({ ok: true });
}
