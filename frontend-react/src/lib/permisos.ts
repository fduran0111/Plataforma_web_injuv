import type { Oportunidad, Usuario } from "@/lib/types";

type OpPermisos = Pick<Oportunidad, "encargados_ids" | "organizacion_id">;

/** "Super tutor": admin INJUV o administrador de la organización dueña. Gestiona todo el voluntariado
 * (editar, fechas, imagen, cerrar, eliminar, encargados, estados de postulación y certificados). */
export function puedeGestionarOportunidad(user: Usuario | null, op: OpPermisos): boolean {
  if (!user) return false;
  if (user.rol === "admin") return true;
  return user.organizacion?.id === op.organizacion_id && user.organizacion.rol === "admin";
}

/** Tutor: integrante de la organización asignado como encargado del voluntariado. */
export function esTutorDe(user: Usuario | null, op: OpPermisos): boolean {
  if (!user || user.organizacion?.id !== op.organizacion_id) return false;
  return (op.encargados_ids ?? []).includes(user.id);
}

/** Acciones de tutor (asistencia, horas, evaluación y correo a sus voluntarios). La API valida igual. */
export function puedeTutorear(user: Usuario | null, op: OpPermisos): boolean {
  return puedeGestionarOportunidad(user, op) || esTutorDe(user, op);
}

/** Solo el administrador de la organización publica voluntariados. */
export function esAdminOrganizacion(user: Usuario | null): boolean {
  return user?.rol === "admin" || user?.organizacion?.rol === "admin";
}
