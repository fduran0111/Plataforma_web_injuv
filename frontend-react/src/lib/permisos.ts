import type { Oportunidad, Usuario } from "@/lib/types";

/** Admin INJUV, administrador de la organización o encargado del voluntariado (la API valida igual). */
export function puedeGestionarOportunidad(user: Usuario | null, op: Pick<Oportunidad, "encargados_ids">): boolean {
  if (!user) return false;
  if (user.rol === "admin" || user.organizacion?.rol === "admin") return true;
  return (op.encargados_ids ?? []).includes(user.id);
}
