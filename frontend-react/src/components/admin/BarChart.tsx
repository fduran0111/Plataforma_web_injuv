"use client";

import * as m from "motion/react-m";
import { cn, formatNumber } from "@/lib/format";

const EASE = [0.23, 1, 0.32, 1] as const;

export type TonoGrafico = "brand" | "ambar" | "tinta";
const BARRA: Record<TonoGrafico, string> = { brand: "bg-brand", ambar: "bg-ambar", tinta: "bg-tinta" };

/** Redondea hacia arriba a un número "limpio" para el eje (1, 2, 5 × 10ⁿ). */
function techo(v: number) {
  if (v <= 10) return 10;
  const p = 10 ** Math.floor(Math.log10(v));
  return [1, 2, 4, 5, 10].map((k) => k * p).find((x) => x >= v) ?? v;
}

/**
 * Barras por mes con eje, líneas guía y detalle al pasar el mouse o enfocar con teclado.
 * Las barras crecen desde la base una sola vez al entrar en pantalla (escalonadas 35 ms).
 */
export default function BarChart({ data, tono = "brand" }: { data: { label: string; cantidad: number }[]; tono?: TonoGrafico }) {
  const max = techo(Math.max(1, ...data.map((d) => d.cantidad)));
  const pico = Math.max(...data.map((d) => d.cantidad));
  const guias = [max, max / 2, 0];

  return (
    <div className="flex gap-3">
      <div className="flex h-48 flex-col justify-between pb-6 text-right text-[11px] tabular-nums text-fg-muted" aria-hidden>
        {guias.map((g) => (
          <span key={g} className="-translate-y-1/2 leading-none first:translate-y-0 last:translate-y-0">
            {formatNumber(Math.round(g))}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-42 flex-col justify-between" aria-hidden>
          {guias.map((g, i) => (
            <span key={g} className={cn("absolute inset-x-0 border-t", i === 2 ? "border-tinta/15" : "border-dashed border-tinta/10")} style={{ top: `${i * 50}%` }} />
          ))}
        </div>
        <m.ul
          className="relative flex h-48 items-end gap-1 sm:gap-1.5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.035 } } }}
        >
          {data.map((d) => {
            const alto = (d.cantidad / max) * 100;
            return (
              <li key={d.label} className="group flex h-full min-w-0 flex-1 flex-col items-center">
                <div className="relative flex h-42 w-full items-end justify-center">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-md bg-tinta px-2 py-1 text-xs font-semibold tabular-nums text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 group-hover:-translate-y-3 group-hover:opacity-100"
                    style={{ bottom: `${alto}%` }}
                  >
                    {formatNumber(d.cantidad)}
                  </span>
                  {d.cantidad > 0 ? (
                    <m.span
                      className={cn(
                        "block w-full max-w-9 origin-bottom rounded-t-md transition-opacity duration-150",
                        BARRA[tono],
                        d.cantidad === pico ? "opacity-100" : "opacity-60 group-hover:opacity-100",
                      )}
                      style={{ height: `${alto}%` }}
                      variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.7, ease: EASE } } }}
                    />
                  ) : (
                    <span className="block h-0.5 w-full max-w-9 rounded-full bg-tinta/10" />
                  )}
                </div>
                <span className={cn("mt-2 w-full text-center text-[10px] leading-none tracking-tight", d.cantidad === pico ? "font-semibold text-fg" : "text-fg-muted")}>
                  {d.label}
                  <span className="sr-only">: {formatNumber(d.cantidad)}</span>
                </span>
              </li>
            );
          })}
        </m.ul>
      </div>
    </div>
  );
}

/**
 * Ranking horizontal: posición, nombre, barra proporcional al máximo y cifra con porcentaje del total.
 * Las barras se extienden de izquierda a derecha al entrar en pantalla.
 */
export function HBarChart({ data, tono = "brand" }: { data: { label: string; cantidad: number }[]; tono?: TonoGrafico }) {
  const max = Math.max(1, ...data.map((d) => d.cantidad));
  const total = data.reduce((a, d) => a + d.cantidad, 0) || 1;
  return (
    <m.ol
      className="space-y-3.5"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
    >
      {data.slice(0, 10).map((d, i) => (
        <li key={d.label} className="text-sm">
          <div className="mb-1.5 flex items-baseline gap-2.5">
            <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-fg-muted">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-fg-secondary" title={d.label}>
              {d.label}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-fg">{formatNumber(d.cantidad)}</span>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-fg-muted">{Math.round((d.cantidad / total) * 100)}%</span>
          </div>
          <div className="ml-6.5 h-2 overflow-hidden rounded-full bg-tinta/[0.06]">
            <m.div
              className={cn("h-full origin-left rounded-full", BARRA[tono], i > 0 && "opacity-70")}
              style={{ width: `${(d.cantidad / max) * 100}%` }}
              variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.8, ease: EASE } } }}
            />
          </div>
        </li>
      ))}
    </m.ol>
  );
}
