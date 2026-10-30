"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import dynamic from "next/dynamic";

/** Lenis + sincronización con GSAP solo en el cliente, fuera del bundle inicial. */
const SmoothScroll = dynamic(() => import("./SmoothScroll"), { ssr: false });

const loadFeatures = () => import("./features").then((m) => m.default);

/**
 * Base de animación de la app:
 * - `LazyMotion` en modo estricto: usa siempre `m.div` (no `motion.div`) para que el bundle inicial
 *   solo incluya ~5 KB y las features (`domAnimation`) lleguen con `import()` diferido.
 * - `MotionConfig reducedMotion="user"`: respeta `prefers-reduced-motion` en todas las animaciones.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">
        <SmoothScroll />
        {children}
      </MotionConfig>
    </LazyMotion>
  );
}
