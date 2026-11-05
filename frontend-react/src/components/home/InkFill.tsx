"use client";

import * as m from "motion/react-m";
import { useScroll, useTransform } from "motion/react";
import type { MotionValue } from "motion/react";
import { Fragment, useRef } from "react";
import { useReducedMotion } from "@/lib/motion";

function Palabra({ children, progress, range }: { children: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.35, 1]);
  return (
    <m.span className="inline-block" style={{ opacity }}>
      {children}
    </m.span>
  );
}

/**
 * Una frase que se entinta palabra a palabra al subir por la pantalla.
 * Legible desde el inicio (35% tinta → 100%). Movimiento reducido: tinta plena.
 */
export default function InkFill({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 45%"] });
  const reduced = useReducedMotion();
  const words = text.split(" ");

  return (
    <span ref={ref} className={className}>
      {words.map((w, i) => {
        const start = i / words.length;
        const end = start + 1 / words.length;
        return (
          <Fragment key={`${w}-${i}`}>
            {reduced ? (
              <span className="inline">{w}</span>
            ) : (
              <Palabra progress={scrollYProgress} range={[start, Math.min(end, 1)]}>
                {w}
              </Palabra>
            )}
            {i < words.length - 1 ? " " : null}
          </Fragment>
        );
      })}
    </span>
  );
}
