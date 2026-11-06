"use client";

import * as m from "motion/react-m";
import { Children, isValidElement } from "react";

const EASE = [0.23, 1, 0.32, 1] as const;

/**
 * Lista con separadores para las tablas del panel. Las filas entran escalonadas
 * (30 ms, solo las primeras 12 para no retrasar listas largas) subiendo 8px.
 * Cada hijo debe ser un <li>; se conservan su className y su contenido.
 */
export default function FilasAnimadas({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <ul className={className ?? "divide-y divide-tinta/[0.07]"}>
      {Children.map(children, (child, i) =>
        isValidElement<React.LiHTMLAttributes<HTMLLIElement>>(child) && child.type === "li" ? (
          <m.li
            key={child.key ?? i}
            className={child.props.className}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: EASE, delay: Math.min(i, 12) * 0.03 }}
          >
            {child.props.children}
          </m.li>
        ) : (
          child
        ),
      )}
    </ul>
  );
}
