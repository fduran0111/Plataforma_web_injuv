import { getApiBaseUrl } from "@/lib/api";
import type { PortadaPublica } from "@/lib/types";

/** Textos por defecto de los cuadros bajo la foto de inicio de sesión y registro. */
export const ACCESO_DEF = {
  titulo: "Red nacional de voluntariado juvenil",
  subtitulo: "Instituto Nacional de la Juventud, Gobierno de Chile",
  cita: "Tu tiempo puede cambiar una comunidad.",
};

/** Config editable de la portada (servidor, con revalidación); cualquier fallo → null y se usan los defaults. */
export async function cargarPortada(): Promise<PortadaPublica | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/portada`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return (await res.json()) as PortadaPublica;
  } catch {
    return null;
  }
}
