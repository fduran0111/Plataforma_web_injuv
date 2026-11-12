import type { Metadata } from "next";
import HomeClient from "@/components/home/HomeClient";
import { cargarPortada } from "@/lib/portada";

export const metadata: Metadata = { title: "INJUV — Voluntariado" };

export default async function HomePage() {
  const portada = await cargarPortada();
  return <HomeClient portada={portada} />;
}
