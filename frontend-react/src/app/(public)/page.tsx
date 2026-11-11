import type { Metadata } from "next";
import HomeClient from "@/components/home/HomeClient";
import { getApiBaseUrl } from "@/lib/api";
import type { PortadaPublica } from "@/lib/types";

export const metadata: Metadata = { title: "INJUV — Voluntariado" };

/** Portada pública: la config editable se pide al servidor con revalidación; cualquier fallo → defaults. */
async function cargarPortada(): Promise<PortadaPublica | null> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/portada`, { next: { revalidate: 60 }, signal: AbortSignal.timeout(3000) });
    if (!res.ok) return null;
    return (await res.json()) as PortadaPublica;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const portada = await cargarPortada();
  return <HomeClient portada={portada} />;
}
