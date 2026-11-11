"use client";

import { ArrowRight, Pause, Play } from "lucide-react";
import { useInView } from "motion/react";
import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";
import { useReducedMotion } from "@/lib/motion";

type Foto = { src: StaticImageData | string; alt: string };

const BOTON =
  "flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-tinta bg-surface text-tinta transition-colors duration-200 hover:bg-tinta hover:text-papel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const AVANCE_MS = 10000;

/**
 * Carrusel infinito de fotos: la foto activa queda al centro y se asoman la anterior
 * (a la izquierda) y la siguiente (a la derecha). Avanza solo cada 10 s.
 * La pista repite la lista tres veces; al terminar cada transición se recoloca en la
 * copia central sin animar, así el ciclo nunca llega a un borde.
 * El avance automático solo se detiene fuera de pantalla o con el botón de pausa (WCAG 2.2.2).
 * Con movimiento reducido sigue avanzando, pero cambia de foto sin deslizar.
 */
export default function GaleriaFotos({ titulo, fotos }: { titulo: string; fotos: Foto[] }) {
  const n = fotos.length;
  const seccion = useRef<HTMLElement>(null);
  const pista = useRef<HTMLDivElement>(null);
  const toque = useRef<number | null>(null);
  const visible = useInView(seccion, { amount: 0.25 });
  const reduced = useReducedMotion();
  const [pos, setPos] = useState(n);
  const [animar, setAnimar] = useState(true);
  const [pausado, setPausado] = useState(false);
  const activa = ((pos % n) + n) % n;

  const ir = (nueva: number) => {
    // Movimiento reducido: sin transición, directo a la copia central.
    if (reduced) return setPos(n + (((nueva % n) + n) % n));
    if (nueva >= 0 && nueva <= 3 * n - 1) setPos(nueva);
  };

  // Tras cada transición vuelve a la copia central sin animar.
  const recolocar = () => {
    if (pos >= n && pos < 2 * n) return;
    setAnimar(false);
    setPos(n + activa);
  };
  // Respaldo por si transitionend no llega (pestaña en segundo plano, transición interrumpida).
  useEffect(() => {
    if (pos >= n && pos < 2 * n) return;
    const t = setTimeout(recolocar, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos, n]);
  useEffect(() => {
    if (animar) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnimar(true)));
    return () => cancelAnimationFrame(id);
  }, [animar]);

  const auto = !pausado && visible;
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => ir(pos + 1), AVANCE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, pos]);

  const lista = [...fotos, ...fotos, ...fotos];

  return (
    <section
      ref={seccion}
      aria-roledescription="carrusel"
      aria-label={titulo}
      className="overflow-x-clip bg-papel py-20 lg:py-28"
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") ir(pos + 1);
        if (e.key === "ArrowLeft") ir(pos - 1);
      }}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-6 px-4 sm:px-6 lg:px-8">
        <h2 className="font-display text-[clamp(1.5rem,0.8rem+2.9vw,4rem)] leading-[1] tracking-[-0.03em] text-fg lg:whitespace-nowrap">
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          <p className="mr-3 font-display text-xl tabular-nums text-fg" aria-live={auto ? "off" : "polite"}>
            {activa + 1}
            <span className="text-fg-muted"> / {n}</span>
          </p>
          <button
            type="button"
            className={BOTON}
            aria-label={pausado ? "Reanudar avance automático" : "Pausar avance automático"}
            onClick={() => setPausado((p) => !p)}
          >
            {pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
          </button>
          <button type="button" className={BOTON} aria-label="Foto anterior" onClick={() => ir(pos - 1)}>
            <ArrowRight className="h-4 w-4 rotate-180" />
          </button>
          <button type="button" className={BOTON} aria-label="Foto siguiente" onClick={() => ir(pos + 1)}>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        className="mt-10 touch-pan-y select-none"
        onPointerDown={(e) => (toque.current = e.clientX)}
        onPointerUp={(e) => {
          if (toque.current === null) return;
          const dx = e.clientX - toque.current;
          toque.current = null;
          if (Math.abs(dx) > 40) ir(pos + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => (toque.current = null)}
      >
        <div
          ref={pista}
          className={cn("galeria-pista relative left-1/2 flex", animar && "galeria-anima")}
          style={{ "--i": pos } as React.CSSProperties}
          onTransitionEnd={(e) => e.target === pista.current && e.propertyName === "transform" && recolocar()}
        >
          {lista.map((f, i) => {
            const copia = i < n || i >= 2 * n;
            return (
              <figure
                key={i}
                role={copia ? undefined : "group"}
                aria-roledescription={copia ? undefined : "foto"}
                aria-label={copia ? undefined : `${(i % n) + 1} de ${n}`}
                aria-hidden={copia || undefined}
                className={cn(
                  "galeria-foto relative aspect-[4/5] shrink-0 overflow-hidden rounded-2xl bg-papel-strong transition-opacity duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] sm:aspect-[3/2]",
                  i === pos ? "opacity-100" : "opacity-45",
                )}
              >
                <Image
                  src={f.src}
                  alt={copia ? "" : f.alt}
                  fill
                  draggable={false}
                  unoptimized={typeof f.src === "string"}
                  sizes="(min-width: 1024px) 56vw, 80vw"
                  className="object-cover"
                />
              </figure>
            );
          })}
        </div>
      </div>

      <div className="mx-auto mt-6 flex max-w-7xl gap-2 px-4 sm:px-6 lg:px-8">
        {fotos.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Ir a la foto ${i + 1}`}
            aria-current={i === activa}
            onClick={() => ir(n + i)}
            className="group flex-1 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <span className="block h-1 overflow-hidden rounded-full bg-tinta/15">
              <span
                key={i === activa && auto ? pos : undefined}
                className={cn(
                  "block h-full origin-left rounded-full bg-brand",
                  i === activa ? (auto ? "galeria-progreso" : "scale-x-100") : "scale-x-0",
                )}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
