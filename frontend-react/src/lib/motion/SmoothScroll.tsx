"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { isLowMotionDevice, prefersReducedMotion } from "./useReducedMotion";

let instance: Lenis | null = null;
let rafId = 0;
const listeners = new Set<(lenis: Lenis) => void>();

/** Instancia activa de Lenis (null si el scroll suave está desactivado). */
export function getLenis(): Lenis | null {
  return instance;
}

/** Avisa cuando Lenis existe (ahora o al crearse). Lo usa `loadGsap` para sincronizar el ticker. */
export function onLenis(cb: (lenis: Lenis) => void): () => void {
  if (instance) cb(instance);
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Cambia el bucle de Lenis de `requestAnimationFrame` a `gsap.ticker` (ver loadGsap). */
export function driveLenisWith(tick: ((time: number) => void) | null) {
  cancelAnimationFrame(rafId);
  if (tick === null && instance) {
    const loop = (time: number) => {
      instance?.raf(time);
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
  }
}

/**
 * Scroll suave con inercia. Desactivado con `prefers-reduced-motion` y en dispositivos táctiles
 * o de gama baja, donde el scroll nativo es mejor.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion() || isLowMotionDevice()) return;
    const lenis = new Lenis({ lerp: 0.2, wheelMultiplier: 1.15, anchors: true });
    instance = lenis;
    driveLenisWith(null);
    listeners.forEach((cb) => cb(lenis));
    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      instance = null;
    };
  }, []);
  return null;
}
