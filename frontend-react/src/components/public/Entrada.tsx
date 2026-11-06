"use client";

import * as m from "motion/react-m";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Entrada al montar para contenido que llega de la API (detalles): sube 16px con opacidad.
 * `retraso` en segundos para escalonar bloques vecinos. Movimiento reducido: MotionConfig
 * (reducedMotion="user") quita el desplazamiento y deja solo la opacidad.
 */
export default function Entrada({
  as: Tag = "div",
  retraso = 0,
  className,
  children,
}: {
  as?: "div" | "section" | "aside" | "article" | "header" | "p" | "li";
  retraso?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const M = m[Tag];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: EASE, delay: retraso }}
    >
      {children}
    </M>
  );
}
