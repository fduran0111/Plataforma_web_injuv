"use client";

import * as m from "motion/react-m";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Titular que entra una sola vez al aparecer en pantalla: sube 20px y gana opacidad.
 * Movimiento reducido: MotionConfig (reducedMotion="user") elimina el desplazamiento.
 */
export default function RevealText({
  as: Tag = "h2",
  text,
  className,
  highlight,
  highlightClassName = "text-ambar",
}: {
  as?: "h1" | "h2" | "h3" | "p" | "span";
  text: string;
  className?: string;
  highlight?: string;
  highlightClassName?: string;
}) {
  const M = m[Tag];
  const i = highlight ? text.indexOf(highlight) : -1;
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      {i < 0 || !highlight ? (
        text
      ) : (
        <>
          {text.slice(0, i)}
          <span className={highlightClassName}>{highlight}</span>
          {text.slice(i + highlight.length)}
        </>
      )}
    </M>
  );
}
