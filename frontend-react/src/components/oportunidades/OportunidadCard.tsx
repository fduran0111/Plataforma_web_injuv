import { CalendarDays, Clock, HeartHandshake, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge } from "@/components/ui";
import { fileUrl } from "@/lib/api";
import { ICONO_AREA } from "@/lib/areas";
import { AREAS_VOLUNTARIADO, ESTADO_OPORTUNIDAD } from "@/lib/constants";
import { cn, daysUntil, formatDate } from "@/lib/format";
import type { Oportunidad } from "@/lib/types";

const TONOS_AREA = [
  { fondo: "bg-brand text-white", marca: "text-white/15" },
  { fondo: "bg-tinta text-papel", marca: "text-ambar/25" },
  { fondo: "bg-ambar text-tinta", marca: "text-tinta/15" },
  { fondo: "bg-brand-soft text-brand-dark", marca: "text-brand/15" },
];

export function DeadlineBadge({ fecha, estado }: { fecha: string | null; estado: string }) {
  if (estado === "cerrada") return <Badge tone="slate">Cerrada</Badge>;
  const days = daysUntil(fecha);
  if (days === null) return <Badge tone="green">Abierta</Badge>;
  if (days < 0) return <Badge tone="slate">Plazo vencido</Badge>;
  if (days === 0) return <Badge tone="red">Cierra hoy</Badge>;
  if (days <= 7) return <Badge tone="amber">Cierra en {days} {days === 1 ? "día" : "días"}</Badge>;
  return <Badge tone="green">{ESTADO_OPORTUNIDAD[estado]?.label ?? "Abierta"}</Badge>;
}

function Franja({ op, estado }: { op: Oportunidad; estado: React.ReactNode }) {
  const area = op.tipo_de_voluntariado;
  if (op.tiene_imagen) {
    return (
      <div className="relative aspect-[16/9] shrink-0 bg-papel-strong">
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API */}
        <img src={fileUrl.oportunidad(op.id)} alt="" loading="lazy" className="h-full w-full object-cover object-[50%_25%]" />
        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-3">
          {area ? <Badge tone="blue">{area}</Badge> : <span />}
          {estado}
        </div>
      </div>
    );
  }
  const Icon = ICONO_AREA[area] ?? HeartHandshake;
  const i = AREAS_VOLUNTARIADO.indexOf(area);
  const tono = TONOS_AREA[(i < 0 ? 1 : i) % TONOS_AREA.length];
  return (
    <div className={cn("relative flex aspect-[16/9] shrink-0 flex-col justify-between overflow-clip p-4", tono.fondo)}>
      <Icon aria-hidden strokeWidth={1.25} className={cn("pointer-events-none absolute -bottom-9 -right-6 h-44 w-44 -rotate-12", tono.marca)} />
      <div className="relative flex justify-end">{estado}</div>
      {area && <p className="relative font-display text-xl leading-none tracking-[-0.02em]">{area}</p>}
    </div>
  );
}

export default function OportunidadCard({ op, postulado }: { op: Oportunidad; postulado?: boolean }) {
  const lugar = [op.comuna, op.region].filter(Boolean).join(", ");
  const otrasSedes = Math.max(0, (op.ubicaciones?.length ?? 0) - 1);
  return (
    <div
      id={`op-${op.id}`}
      className="group tarjeta-crece relative flex h-full flex-col overflow-clip rounded-2xl bg-surface ring-1 ring-tinta/10 focus-within:ring-2 focus-within:ring-brand"
    >
      <Link href={`/oportunidades/${op.id}`} className="flex flex-1 flex-col focus-visible:outline-none">
        <Franja
          op={op}
          estado={postulado ? <Badge tone="violet">Ya postulaste</Badge> : <DeadlineBadge fecha={op.fecha_limite_postulacion} estado={op.estado} />}
        />
        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-2 [overflow-wrap:anywhere] text-h3 text-fg transition-colors duration-200 group-hover:text-brand [text-wrap:balance]">{op.titulo}</h3>
          <p className="mt-2 line-clamp-2 flex-1 [overflow-wrap:anywhere] text-sm leading-relaxed text-fg-secondary">{op.descripcion}</p>
          <div className="mt-4 flex items-center gap-2.5">
            <Avatar name={op.organizacion_nombre || "Org"} src={op.organizacion_tiene_logo ? fileUrl.logo(op.organizacion_id) : null} size={28} />
            <span className="truncate text-sm font-medium text-fg-secondary">{op.organizacion_nombre}</span>
          </div>
          <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-tinta/10 pt-4 text-sm text-fg-secondary tabular-nums">
            <div className="flex min-w-0 basis-full items-center gap-2">
              <MapPin aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" />
              <dt className="sr-only">Lugar</dt>
              <dd className="flex min-w-0 gap-1.5">
                <span className="truncate">{lugar || "Sin ubicación"}</span>
                {otrasSedes > 0 && <span className="shrink-0 font-medium">+{otrasSedes} más</span>}
              </dd>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <CalendarDays aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" />
              <dt className="sr-only">Plazo para postular</dt>
              <dd className="font-medium text-fg">{op.fecha_limite_postulacion ? `Hasta ${formatDate(op.fecha_limite_postulacion)}` : "Sin fecha límite"}</dd>
            </div>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <Users aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" />
              <dt className="sr-only">Cupos</dt>
              <dd>{op.cupo_maximo ? `${op.cupo_maximo} cupos` : "Cupos abiertos"}</dd>
            </div>
            {op.horas_voluntariado ? (
              <div className="flex items-center gap-2 whitespace-nowrap">
                <Clock aria-hidden className="h-4 w-4 shrink-0 text-fg-muted" />
                <dt className="sr-only">Duración</dt>
                <dd>{op.horas_voluntariado} horas</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </Link>
    </div>
  );
}

export function OportunidadCardSkeleton() {
  return (
    <div className="animate-pulse overflow-clip rounded-2xl bg-surface ring-1 ring-tinta/10">
      <div className="aspect-[16/9] bg-papel-strong" />
      <div className="p-5">
        <div className="h-5 w-4/5 rounded-sm bg-papel-strong" />
        <div className="mt-3 h-4 w-full rounded-sm bg-papel-strong" />
        <div className="mt-2 h-4 w-2/3 rounded-sm bg-papel-strong" />
        <div className="mt-6 h-8 w-1/2 rounded-sm bg-papel-strong" />
      </div>
    </div>
  );
}
