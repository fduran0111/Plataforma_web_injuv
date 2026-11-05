"use client";

import * as m from "motion/react-m";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Una sola entrada para toda la página: sube 20px con opacidad, sin escalas ni desplazamientos laterales. */
const ITEM = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
} as const;

/**
 * Contenedor que orquesta la entrada escalonada de sus hijos al entrar en vista.
 * Cada hijo debe envolverse en <StaggerItem> (las variantes se propagan por contexto).
 */
export function Stagger({
  className,
  stagger = 0.06,
  children,
}: {
  className?: string;
  stagger?: number;
  children: React.ReactNode;
}) {
  return (
    <m.div
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </m.div>
  );
}

export function StaggerItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <m.div className={className} variants={ITEM}>
      {children}
    </m.div>
  );
}
