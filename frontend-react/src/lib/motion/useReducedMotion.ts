"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/** `true` si el usuario pidió reducir el movimiento. En el servidor devuelve `true` (lo más conservador). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => true,
  );
}

export function prefersReducedMotion(): boolean {
  return typeof window === "undefined" || window.matchMedia(QUERY).matches;
}

/** Dispositivos táctiles o de gama baja: sin scroll suave ni efectos costosos. */
export function isLowMotionDevice(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency ?? 8) <= 4;
}
