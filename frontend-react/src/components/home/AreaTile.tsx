"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useRef } from "react";
import { cn } from "@/lib/format";

const EASE = [0.23, 1, 0.32, 1] as const;
const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0.3 };

/** Columnas de la grilla en escritorio: el retraso sigue una ola diagonal (fila + columna). */
const COLS = 4;

export type Tono = "claro" | "azul" | "tinta";

/** Superficie, círculo del ícono y marca de agua para cada tono. */
const TONOS: Record<Tono, { fondo: string; chip: string; marca: string }> = {
  claro: { fondo: "bg-surface text-tinta", chip: "bg-brand-soft text-brand", marca: "text-brand opacity-[0.07]" },
  azul: { fondo: "bg-brand text-white", chip: "bg-white/15 text-white", marca: "text-white opacity-[0.14]" },
  tinta: { fondo: "bg-tinta text-papel", chip: "bg-papel/10 text-ambar", marca: "text-ambar opacity-[0.16]" },
};
/** Tono de la copia que se revela al hover: siempre contrasta con la base. */
const INVERSO: Record<Tono, Tono> = { claro: "azul", azul: "tinta", tinta: "claro" };

function Contenido({ area, Icon, tono, ancho }: { area: string; Icon: LucideIcon; tono: Tono; ancho?: boolean }) {
  const t = TONOS[tono];
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <Icon
          className={cn("area-marca absolute", ancho ? "-bottom-12 -right-6 h-56 w-56" : "-bottom-8 -right-8 h-36 w-36", t.marca)}
          strokeWidth={1.25}
        />
      </span>
      <span className="relative flex items-start justify-between">
        <m.span
          className={cn("flex h-12 w-12 items-center justify-center rounded-full", t.chip)}
          variants={{ hidden: { scale: 1, rotate: 0 }, show: { scale: 1, rotate: 0, transition: SPRING }, hover: { scale: 1.14, rotate: -10, transition: SPRING } }}
        >
          <Icon className="h-5 w-5" aria-hidden />
        </m.span>
        <m.span
          className="flex h-9 w-9 items-center justify-center rounded-full border border-current/25"
          variants={{ hidden: { x: -8, opacity: 0 }, show: { x: -8, opacity: 0 }, hover: { x: 0, opacity: 1, transition: { duration: 0.25, ease: EASE } } }}
        >
          <ArrowRight className="h-4 w-4" aria-hidden />
        </m.span>
      </span>
      <span
        className={cn(
          "relative font-display leading-[1.05] tracking-[-0.02em]",
          ancho ? "max-w-[12ch] text-[clamp(1.75rem,1.2rem+1.6vw,2.75rem)]" : "text-[clamp(1.125rem,0.95rem+0.5vw,1.5rem)]",
        )}
      >
        {area}
      </span>
    </>
  );
}

/**
 * Tarjeta de área con relleno que nace desde el punto por donde entra el puntero
 * y se retira por donde sale. Una copia en el tono inverso se revela con clip-path,
 * así fondo y texto cambian en el mismo cuadro, sin interpolar colores.
 * El ícono responde con un resorte, la flecha entra deslizándose y la marca de agua
 * gira hasta quedar a la vista. Las tarjetas anchas son las destacadas del mosaico.
 */
export default function AreaTile({
  area,
  href,
  Icon,
  index,
  tono = "claro",
  ancho,
}: {
  area: string;
  href: string;
  Icon: LucideIcon;
  index: number;
  tono?: Tono;
  ancho?: boolean;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const origen = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  const ola = (index % COLS) + Math.floor(index / COLS);
  const caja = "flex flex-col justify-between gap-8 p-5 lg:p-6";

  return (
    <m.div
      className={cn("h-full", ancho && "col-span-2")}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      variants={{
        hidden: { opacity: 0, y: 32, scale: 0.95 },
        show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.65, ease: EASE, delay: ola * 0.06 } },
      }}
      whileHover="hover"
      whileFocus="hover"
      whileTap={{ scale: 0.97, transition: { duration: 0.16, ease: EASE } }}
    >
      <Link
        ref={ref}
        href={href}
        onPointerEnter={origen}
        onPointerLeave={origen}
        className={cn(
          "area-tile relative isolate h-full min-h-[10rem] overflow-hidden rounded-2xl shadow-[0_1px_2px_rgb(15_27_45/0.06)] transition-shadow duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:min-h-[12rem]",
          caja,
          TONOS[tono].fondo,
        )}
      >
        <Contenido area={area} Icon={Icon} tono={tono} ancho={ancho} />
        <span aria-hidden className={cn("area-tile-copia absolute inset-0", caja, TONOS[INVERSO[tono]].fondo)}>
          <Contenido area={area} Icon={Icon} tono={INVERSO[tono]} ancho={ancho} />
        </span>
      </Link>
    </m.div>
  );
}
