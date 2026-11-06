"use client";

import { BookOpen, Building2, Clock, GraduationCap, HeartHandshake, Inbox, Newspaper, Users, UserCheck } from "lucide-react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useState } from "react";
import BarChart, { HBarChart, type TonoGrafico } from "@/components/admin/BarChart";
import RollingNumber from "@/components/home/RollingNumber";
import { Card, ErrorState, LinkButton, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { cn, formatNumber } from "@/lib/format";
import type { EstadisticasAdmin, Serie } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

const EASE = [0.23, 1, 0.32, 1] as const;
const ENTRADA = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } };

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  parte,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  parte?: number;
}) {
  const pct = parte !== undefined && value > 0 ? Math.round((parte / value) * 100) : null;
  return (
    <m.div variants={ENTRADA} className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-2.5 text-sm font-medium text-fg-muted">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </div>
      <p className="font-display text-[clamp(1.875rem,1.4rem+1.4vw,2.5rem)] leading-none tracking-[-0.02em] text-fg">
        <RollingNumber value={value} />
      </p>
      {hint && (
        <div className="mt-auto">
          {pct !== null && (
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-tinta/[0.06]">
              <m.div
                className="h-full origin-left rounded-full bg-ambar"
                style={{ width: `${pct}%` }}
                variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.9, ease: EASE, delay: 0.3 } } }}
              />
            </div>
          )}
          <p className="text-xs text-fg-muted">
            {hint}
            {pct !== null && <span className="font-semibold text-fg-secondary"> · {pct}%</span>}
          </p>
        </div>
      )}
    </m.div>
  );
}

function Mini({
  icon: Icon,
  label,
  value,
  hint,
  href,
  alerta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  hint?: string;
  href?: string;
  alerta?: string;
}) {
  return (
    <m.div variants={ENTRADA}>
      <Card className="flex h-full items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tinta text-ambar">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-fg-muted">{label}</p>
          <p className="flex flex-wrap items-baseline gap-x-2 font-display text-2xl leading-tight text-fg tabular-nums">
            {formatNumber(value)}
            {hint && <span className="font-sans text-xs font-normal text-fg-muted">{hint}</span>}
            {alerta && href && (
              <Link
                href={href}
                className="self-center rounded-full bg-ambar/20 px-2 py-0.5 font-sans text-xs font-semibold text-[#8a5a0b] transition-colors hover:bg-ambar/35"
              >
                {alerta}
              </Link>
            )}
          </p>
        </div>
      </Card>
    </m.div>
  );
}

function Grafico({ titulo, serie, tono }: { titulo: string; serie: Serie; tono: TonoGrafico }) {
  const total = serie.reduce((a, d) => a + d.cantidad, 0);
  const pico = serie.reduce((a, d) => (d.cantidad > a.cantidad ? d : a), serie[0] ?? { label: "", cantidad: 0 });
  return (
    <m.div variants={ENTRADA}>
      <Card className="h-full p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-fg">{titulo}</h3>
            <p className="mt-1 font-display text-3xl leading-none text-fg tabular-nums">{formatNumber(total)}</p>
          </div>
          {pico.cantidad > 0 && (
            <p className="rounded-full bg-tinta/[0.05] px-2.5 py-1 text-xs text-fg-muted">
              Mayor: <span className="font-semibold text-fg-secondary">{pico.label}</span>
            </p>
          )}
        </div>
        <BarChart data={serie} tono={tono} />
      </Card>
    </m.div>
  );
}

function Ranking({ titulo, serie, tono }: { titulo: string; serie: Serie; tono?: TonoGrafico }) {
  return (
    <m.div variants={ENTRADA}>
      <Card className="h-full p-6">
        <h3 className="mb-5 text-sm font-semibold text-fg">{titulo}</h3>
        {serie.length ? <HBarChart data={serie} tono={tono} /> : <p className="text-sm text-fg-muted">Sin datos para este año.</p>}
      </Card>
    </m.div>
  );
}

const grupo = (stagger = 0.07) => ({
  initial: "hidden" as const,
  animate: "show" as const,
  variants: { hidden: {}, show: { transition: { staggerChildren: stagger } } },
});

export default function AdminResumenPage() {
  const { user } = useAuth();
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const { data, loading, error, reload } = useApi<EstadisticasAdmin>(`/admin/estadisticas?anio=${anio}`);

  if (loading && !data) return <Spinner label="Cargando estadísticas…" />;
  if (error || !data) return <ErrorState message={error ?? "Error"} onRetry={reload} />;
  const r = data.resumen;
  const anios = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <>
      <PageHeader
        title={user?.nombre ? `Hola, ${user.nombre}` : "Resumen de la plataforma"}
        description="Resumen de la plataforma: panorama general de usuarios, voluntariados y actividad."
        actions={
          r.solicitudes_pendientes > 0 && (
            <LinkButton href="/admin/solicitudes" size="sm">
              <Inbox className="h-4 w-4" /> {r.solicitudes_pendientes} solicitudes pendientes
            </LinkButton>
          )
        }
      />

      <m.div
        {...grupo(0.08)}
        className="grid gap-px overflow-hidden rounded-2xl border border-tinta/[0.08] bg-tinta/[0.08] shadow-[0_1px_2px_rgb(15_27_45/0.04),0_4px_16px_-8px_rgb(15_27_45/0.08)] grid-cols-2 xl:grid-cols-4 [&>*]:bg-surface"
      >
        <Kpi icon={Users} label="Usuarios registrados" value={r.usuarios} hint={`${formatNumber(r.voluntarios)} voluntarios`} parte={r.voluntarios} />
        <Kpi icon={Building2} label="Organizaciones" value={r.organizaciones} />
        <Kpi icon={HeartHandshake} label="Voluntariados" value={r.oportunidades} hint={`${formatNumber(r.oportunidades_abiertas)} abiertos`} parte={r.oportunidades_abiertas} />
        <Kpi icon={UserCheck} label="Postulaciones" value={r.postulaciones} hint={`${formatNumber(r.seleccionados)} seleccionados`} parte={r.seleccionados} />
      </m.div>

      <m.div {...grupo(0.06)} className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Mini icon={Clock} label="Horas de voluntariado" value={r.horas_voluntariado} />
        <Mini icon={Newspaper} label="Noticias publicadas" value={r.noticias} />
        <Mini icon={BookOpen} label="Biblioteca" value={r.documentos_biblioteca} hint="documentos" />
        <Mini
          icon={GraduationCap}
          label="Academia"
          value={r.documentos_academia}
          href="/admin/repositorio"
          alerta={r.academia_pendientes > 0 ? `${formatNumber(r.academia_pendientes)} por revisar` : undefined}
        />
      </m.div>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-fg">Actividad del año {data.anio}</h2>
          <p className="mt-1 text-sm text-fg-muted">Registros por mes. Pasa el mouse sobre una barra para ver la cifra.</p>
        </div>
        <div role="radiogroup" aria-label="Año" className="flex rounded-xl bg-tinta/[0.06] p-1">
          {anios.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={anio === a}
              onClick={() => setAnio(a)}
              className={cn(
                "relative rounded-lg px-3.5 py-1.5 text-sm font-semibold tabular-nums transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-brand",
                anio === a ? "bg-surface text-fg shadow-[0_1px_3px_rgb(15_27_45/0.12)]" : "text-fg-muted hover:text-fg",
              )}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <m.div key={`g-${data.anio}`} {...grupo()} className={cn("mt-5 grid gap-4 lg:grid-cols-3 transition-opacity", loading && "opacity-60")}>
        <Grafico titulo="Nuevos usuarios" serie={data.usuarios_por_mes} tono="brand" />
        <Grafico titulo="Voluntariados creados" serie={data.oportunidades_por_mes} tono="ambar" />
        <Grafico titulo="Postulaciones" serie={data.postulaciones_por_mes} tono="tinta" />
      </m.div>

      <m.div key={`r-${data.anio}`} {...grupo()} className={cn("mt-4 grid gap-4 lg:grid-cols-3 transition-opacity", loading && "opacity-60")}>
        <Ranking titulo="Voluntariados por área" serie={data.oportunidades_por_area} />
        <Ranking titulo="Postulaciones por estado" serie={data.postulaciones_por_estado} tono="tinta" />
        <Ranking titulo="Organizaciones más activas" serie={data.oportunidades_por_organizacion} tono="ambar" />
      </m.div>
    </>
  );
}
