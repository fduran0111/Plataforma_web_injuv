"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";
import { useMotionValue, useSpring, useTransform } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { cn } from "@/lib/format";
import { useReducedMotion } from "@/lib/motion";

const EASE = [0.23, 1, 0.32, 1] as const;
const RESORTE = { stiffness: 220, damping: 22, mass: 0.6 };
const INCLINACION = 7; // grados máximos

export type Recurso = {
  href: string;
  icon: LucideIcon;
  title: string;
  text: string;
  cta: string;
  card: string;
  chip: string;
  body: string;
  go: string;
};

/**
 * Tarjeta de recurso con profundidad: con mouse se inclina hacia el puntero (resorte) y
 * sus capas se separan en Z (ícono y flecha más cerca que el texto). Entra subiendo y el
 * ícono aparece después con un pequeño rebote. La flecha se reemplaza por otra al hover.
 * Táctil y movimiento reducido: sin inclinación.
 */
export default function RecursoCard({ r, index }: { r: Recurso; index: number }) {
  const reduced = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [INCLINACION, -INCLINACION]), RESORTE);
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-INCLINACION, INCLINACION]), RESORTE);

  const mover = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduced || e.pointerType !== "mouse") return;
    const b = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - b.left) / b.width - 0.5);
    py.set((e.clientY - b.top) / b.height - 0.5);
  };
  const soltar = () => {
    px.set(0);
    py.set(0);
  };
  const { icon: Icon } = r;

  return (
    <m.div
      className="h-full [perspective:1000px]"
      variants={{
        hidden: { opacity: 0, y: 64, rotateX: 22 },
        show: {
          opacity: 1,
          y: 0,
          rotateX: 0,
          transition: { type: "spring", duration: 0.9, bounce: 0.2, delay: index * 0.12, opacity: { duration: 0.4, ease: EASE, delay: index * 0.12 } },
        },
      }}
      style={{ transformOrigin: "50% 100%" }}
      onPointerMove={mover}
      onPointerLeave={soltar}
    >
      <m.div
        className="recurso h-full rounded-2xl [transform-style:preserve-3d]"
        style={{ rotateX, rotateY }}
        whileTap={{ scale: 0.98, transition: { duration: 0.16, ease: EASE } }}
      >
        <Link
          href={r.href}
          className={cn(
            "group relative flex h-full min-h-[19rem] flex-col rounded-2xl p-7 shadow-[0_1px_2px_rgb(15_27_45/0.08)] transition-shadow duration-300 [transform-style:preserve-3d] hover:shadow-[0_30px_60px_-28px_rgb(15_27_45/0.55)] focus-visible:outline-2 focus-visible:outline-offset-4 lg:p-8",
            r.card,
          )}
        >
          <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <Icon className="recurso-marca absolute -bottom-10 -right-10 h-48 w-48 opacity-[0.12]" strokeWidth={1.25} />
          </span>
          <span className="block w-fit [transform:translateZ(48px)]">
            <m.span
              className={cn("flex h-12 w-12 items-center justify-center rounded-full", r.chip)}
              variants={{
                hidden: { opacity: 0, scale: 0.6 },
                show: { opacity: 1, scale: 1, transition: { type: "spring", duration: 0.5, bounce: 0.3, delay: index * 0.1 + 0.25 } },
              }}
            >
              <Icon className="h-6 w-6 transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-rotate-12" aria-hidden />
            </m.span>
          </span>
          <h3 className="mt-10 font-display text-[clamp(1.5rem,1.2rem+0.8vw,1.875rem)] leading-[1.1] tracking-[-0.02em] [transform:translateZ(28px)]">
            {r.title}
          </h3>
          <p className={cn("mt-3 text-base [transform:translateZ(16px)]", r.body)}>{r.text}</p>
          <span className="mt-auto flex items-center justify-between gap-4 pt-8 font-semibold [transform:translateZ(36px)]">
            <span className="relative">
              {r.cta}
              <span aria-hidden className="recurso-subrayado absolute -bottom-1 left-0 h-0.5 w-full origin-left rounded-full bg-current" />
            </span>
            <span className={cn("relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full", r.go)} aria-hidden>
              <ArrowRight className="flecha-sale h-4 w-4" />
              <ArrowRight className="flecha-entra absolute h-4 w-4" />
            </span>
          </span>
        </Link>
      </m.div>
    </m.div>
  );
}
