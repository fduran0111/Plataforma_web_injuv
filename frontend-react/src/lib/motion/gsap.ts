"use client";

/**
 * Registro de GSAP + ScrollTrigger sincronizado con Lenis.
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
import { driveLenisWith, onLenis } from "./SmoothScroll";

let registered = false;

export function registerGsap() {
  if (!registered && typeof window !== "undefined") {
    registered = true;
    gsap.registerPlugin(ScrollTrigger, useGSAP);
    gsap.ticker.lagSmoothing(0);
    onLenis((lenis) => {
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      driveLenisWith(tick);
    });
  }
  return { gsap, ScrollTrigger, useGSAP };
}

export { gsap, ScrollTrigger, useGSAP };
