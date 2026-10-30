import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge, Recorte } from "@/components/ui";
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
    <Recorte id={`op-${op.id}`} className="group flex h-full">
      <Link href={`/oportunidades/${op.id}`} className="flex flex-1 flex-col p-5 focus-visible:outline-none">
        <div className="flex items-start justify-between gap-3">
          {op.tipo_de_voluntariado ? <Badge tone="blue">{op.tipo_de_voluntariado}</Badge> : <span />}
          {postulado ? <Badge tone="violet">Ya postulaste</Badge> : <DeadlineBadge fecha={op.fecha_limite_postulacion} estado={op.estado} />}
        </div>
        <h3 className="titulo-vivo mt-4 line-clamp-2 text-h3 text-fg">{op.titulo}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-fg-muted">{op.descripcion}</p>
        <div className="mt-4 flex items-center gap-2.5">
          <Avatar name={op.organizacion_nombre || "Org"} src={op.organizacion_tiene_logo ? fileUrl.logo(op.organizacion_id) : null} size={28} />
          <span className="truncate text-sm font-medium text-fg-secondary">{op.organizacion_nombre}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 border-t-[1.5px] border-dashed border-tinta/25 pt-4 text-xs text-fg-muted">
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
    </Recorte>
  );
}

export function OportunidadCardSkeleton() {
  return (
    <div className="recorte animate-pulse p-5">
      <div className="h-5 w-24 rounded-sm bg-papel-strong" />
      <div className="mt-4 h-5 w-4/5 rounded-sm bg-papel-strong" />
      <div className="mt-3 h-4 w-full rounded-sm bg-papel-strong" />
      <div className="mt-2 h-4 w-2/3 rounded-sm bg-papel-strong" />
      <div className="mt-6 h-8 w-1/2 rounded-sm bg-papel-strong" />
    </div>
  );
}
