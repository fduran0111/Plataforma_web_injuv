"use client";

/**
 * Registro de GSAP + ScrollTrigger (sobre el scroll nativo).
 *
 * IMPORTANTE: importa este módulo SOLO desde componentes cargados con `next/dynamic`
 * (home, perfil). Así GSAP (~37 KB gzip) nunca entra en el bundle inicial.
 *
 *   const Mapa = dynamic(() => import("./MapaChile"), { ssr: false });
 *   // dentro de MapaChile.tsx:
 *   const { gsap, ScrollTrigger } = registerGsap();
 *   useGSAP(() => { ... }, { scope: ref });   // limpia todo al desmontar
 */
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function registerGsap() {
  if (!registered && typeof window !== "undefined") {
    registered = true;
    gsap.registerPlugin(ScrollTrigger, useGSAP);
  }
  return { gsap, ScrollTrigger, useGSAP };
}

export { gsap, ScrollTrigger, useGSAP };
