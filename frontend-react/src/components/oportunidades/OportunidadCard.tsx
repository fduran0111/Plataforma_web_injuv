import { ArrowUpRight, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge } from "@/components/ui";
import { fileUrl } from "@/lib/api";
import { ESTADO_OPORTUNIDAD } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import type { Oportunidad } from "@/lib/types";

export function DeadlineBadge({ fecha, estado }: { fecha: string | null; estado: string }) {
  if (estado === "cerrada") return <Badge tone="slate">Cerrada</Badge>;
  const days = daysUntil(fecha);
  if (days === null) return <Badge tone="green">Abierta</Badge>;
  if (days < 0) return <Badge tone="slate">Plazo vencido</Badge>;
  if (days === 0) return <Badge tone="red">Cierra hoy</Badge>;
  if (days <= 7) return <Badge tone="amber">Cierra en {days} {days === 1 ? "día" : "días"}</Badge>;
  return <Badge tone="green">{ESTADO_OPORTUNIDAD[estado]?.label ?? "Abierta"}</Badge>;
}

export default function OportunidadCard({ op, postulado }: { op: Oportunidad; postulado?: boolean }) {
  const ubicacion = [op.comuna, op.region].filter(Boolean).join(", ");
  return (
    <div
      id={`op-${op.id}`}
      className="group relative flex h-full flex-col rounded-2xl bg-surface ring-1 ring-tinta/10 transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:ring-2 focus-within:ring-brand hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-24px_rgb(15_27_45/0.35)]"
    >
      <Link href={`/oportunidades/${op.id}`} className="flex flex-1 flex-col p-5 focus-visible:outline-none">
        <div className="flex items-start justify-between gap-3">
          {op.tipo_de_voluntariado ? <Badge tone="blue">{op.tipo_de_voluntariado}</Badge> : <span />}
          {postulado ? <Badge tone="violet">Ya postulaste</Badge> : <DeadlineBadge fecha={op.fecha_limite_postulacion} estado={op.estado} />}
        </div>
        <h3 className="mt-4 line-clamp-2 text-h3 text-fg transition-colors duration-200 group-hover:text-brand">{op.titulo}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-fg-muted">{op.descripcion}</p>
        <div className="mt-4 flex items-center gap-2.5">
          <Avatar name={op.organizacion_nombre || "Org"} src={op.organizacion_tiene_logo ? fileUrl.logo(op.organizacion_id) : null} size={28} />
          <span className="truncate text-sm font-medium text-fg-secondary">{op.organizacion_nombre}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl bg-papel/70 p-3 pr-14 text-xs text-fg-muted">
          <span className="flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {ubicacion || "Sin ubicación"}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {op.fecha_limite_postulacion ? `Hasta ${formatDate(op.fecha_limite_postulacion)}` : "Sin fecha límite"}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 shrink-0" />
            {op.cupo_maximo ? `${op.cupo_maximo} cupos` : "Cupos abiertos"}
          </span>
          {op.horas_voluntariado ? (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 shrink-0" />
              {op.horas_voluntariado} horas
            </span>
          ) : null}
        </div>
      </Link>
      <span
        aria-hidden
        className="absolute bottom-4 right-4 flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] border-tinta/15 bg-surface text-tinta transition-[background-color,color,transform] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-45 group-hover:border-brand group-hover:bg-brand group-hover:text-white"
      >
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </div>
  );
}

export function OportunidadCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-surface p-5 ring-1 ring-tinta/10">
      <div className="h-5 w-24 rounded-sm bg-papel-strong" />
      <div className="mt-4 h-5 w-4/5 rounded-sm bg-papel-strong" />
      <div className="mt-3 h-4 w-full rounded-sm bg-papel-strong" />
      <div className="mt-2 h-4 w-2/3 rounded-sm bg-papel-strong" />
      <div className="mt-6 h-8 w-1/2 rounded-sm bg-papel-strong" />
    </div>
  );
}
