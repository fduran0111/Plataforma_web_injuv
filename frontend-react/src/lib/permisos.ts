import type { Oportunidad, Usuario } from "@/lib/types";

/** Admin INJUV, administrador de la organización o encargado integrante (la API valida igual).
 * Un encargado externo es solo tutor: no gestiona el voluntariado como organización. */
export function puedeGestionarOportunidad(
  user: Usuario | null,
  op: Pick<Oportunidad, "encargados_ids" | "organizacion_id">
): boolean {
  if (!user) return false;
  if (user.rol === "admin") return true;
  if (user.organizacion?.id !== op.organizacion_id) return false;
  return user.organizacion.rol === "admin" || (op.encargados_ids ?? []).includes(user.id);
}
