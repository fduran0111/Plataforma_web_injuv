"use client";

import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("./features").then((m) => m.default);

/**
 * Base de animación de la app:
 * - `LazyMotion` en modo estricto: usa siempre `m.div` (no `motion.div`) para que el bundle inicial
 *   solo incluya ~5 KB y las features (`domAnimation`) lleguen con `import()` diferido.
 * - `MotionConfig reducedMotion="user"`: respeta `prefers-reduced-motion` en todas las animaciones.
 * - El scroll es el nativo del navegador (sin Lenis): más predecible y accesible.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
