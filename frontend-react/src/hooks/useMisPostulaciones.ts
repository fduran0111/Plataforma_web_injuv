"use client";

import { useMemo } from "react";
import { useApi } from "@/hooks/useApi";
import type { PostulacionUsuario } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

/** IDs de oportunidades a las que el voluntario actual ya postuló (vacío si no hay sesión de voluntario). */
export function useOportunidadesPostuladas(): Set<number> {
  const { user } = useAuth();
  const { data } = useApi<PostulacionUsuario[]>(user?.rol === "user" ? "/usuarios/me/postulaciones" : null);
  return useMemo(() => new Set((data ?? []).map((p) => p.oportunidad_id)), [data]);
}
