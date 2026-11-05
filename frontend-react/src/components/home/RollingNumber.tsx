"use client";

import { useInView } from "motion/react";
import { useRef } from "react";
import { formatNumber } from "@/lib/format";
import { useReducedMotion } from "@/lib/motion";

/**
 * Cifra que rueda hasta su valor una vez al entrar en vista.
 * Cada dígito es una columna recortada de 0–9 que sube a su posición,
 * columnas escalonadas 60 ms. El texto real queda en .sr-only.
 */
export default function RollingNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduced = useReducedMotion();
  const chars = formatNumber(value).split("");
  const digitIndex = (i: number) => chars.slice(0, i).filter((c) => /\d/.test(c)).length;

  return (
    <span ref={ref} className="inline-block">
      <span className="sr-only">{formatNumber(value)}</span>
      <span aria-hidden className="inline-flex leading-none tabular-nums">
        {chars.map((ch, i) =>
          /\d/.test(ch) ? (
            <span key={i} className="inline-block h-[1em] overflow-clip">
              <span
                className="flex flex-col transition-transform duration-[1200ms] ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none"
                style={{
                  transform: `translateY(-${inView || reduced ? Number(ch) : 0}em)`,
                  transitionDelay: reduced ? "0ms" : `${digitIndex(i) * 60}ms`,
                }}
              >
                {Array.from({ length: 10 }, (_, n) => (
                  <span key={n} className="block h-[1em] leading-none">
                    {n}
                  </span>
                ))}
              </span>
            </span>
          ) : (
            <span key={i}>{ch}</span>
          ),
        )}
      </span>
    </span>
  );
}
