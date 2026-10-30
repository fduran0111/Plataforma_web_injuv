"use client";

import { Award, CalendarDays, ExternalLink, Globe, Mail, MapPin, MessageSquareQuote, Phone, Star, Users } from "lucide-react";
import { useParams } from "next/navigation";
import OportunidadCard from "@/components/oportunidades/OportunidadCard";
import { Avatar, Card, EmptyState, ErrorState, Spinner, Stars, Tabs } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useOportunidadesPostuladas } from "@/hooks/useMisPostulaciones";
import { fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Oportunidad, Organizacion, ResenaOrganizacion } from "@/lib/types";
import { useState } from "react";

export default function OrganizacionPage() {
  const { id } = useParams<{ id: string }>();
  const org = useApi<Organizacion>(`/organizaciones/${id}`);
  const ops = useApi<Oportunidad[]>(`/oportunidades?organizacion_id=${id}&estado=todas`);
  const resenas = useApi<ResenaOrganizacion[]>(`/organizaciones/${id}/resenas`);
  const postuladas = useOportunidadesPostuladas();
  const [tab, setTab] = useState<"voluntariados" | "resenas">("voluntariados");

  if (org.loading && !org.data) return <Spinner className="py-32" />;
  if (org.error || !org.data)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState message={org.error ?? "Organización no encontrada"} onRetry={org.reload} />
      </div>
    );
  const o = org.data;
  const abiertas = (ops.data ?? []).filter((op) => op.estado !== "cerrada");
  const cerradas = (ops.data ?? []).filter((op) => op.estado === "cerrada");
  const ubicacion = [o.comuna, o.ciudad, o.region].filter(Boolean).join(", ");

  return (
    <>
      <div className="bg-gradient-to-br from-brand-dark to-brand">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <Avatar name={o.nombre} src={o.tiene_logo ? fileUrl.logo(o.id, o.logo_version) : null} size={96} className="ring-4 ring-white/30" />
          <div className="text-white">
            <h1 className="text-3xl font-bold tracking-tight">{o.nombre}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/80">
              {o.area_trabajo && <span>{o.area_trabajo}</span>}
              {ubicacion && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" /> {ubicacion}
                </span>
              )}
              {o.calificacion_promedio != null && (
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-300 text-amber-300" /> {o.calificacion_promedio} de 5
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_340px] lg:px-8">
        <div className="space-y-6">
          <Card className="p-6 sm:p-8">
            <h2 className="font-semibold text-fg">Sobre la organización</h2>
            <p className="prose-text mt-3 text-fg-secondary">{o.descripcion || "Esta organización aún no agrega una descripción."}</p>
          </Card>

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "voluntariados", label: "Voluntariados", count: ops.data?.length },
              { value: "resenas", label: "Reseñas", count: resenas.data?.length },
            ]}
          />

          {tab === "voluntariados" &&
            (ops.loading && !ops.data ? (
              <Spinner />
            ) : !ops.data?.length ? (
              <EmptyState icon={Users} title="Aún no publica voluntariados" />
            ) : (
              <div className="space-y-6">
                {!!abiertas.length && (
                  <div className="grid gap-5 sm:grid-cols-2">
                    {abiertas.map((op) => (
                      <OportunidadCard key={op.id} op={op} postulado={postuladas.has(op.id)} />
                    ))}
                  </div>
                )}
                {!!cerradas.length && (
                  <>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">Voluntariados anteriores</h3>
                    <div className="grid gap-5 opacity-80 sm:grid-cols-2">
                      {cerradas.map((op) => (
                        <OportunidadCard key={op.id} op={op} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}

          {tab === "resenas" &&
            (!resenas.data?.length ? (
              <EmptyState icon={MessageSquareQuote} title="Todavía no hay reseñas públicas" />
            ) : (
              <div className="space-y-4">
                {resenas.data.map((r) => (
                  <Card key={r.postulacion_id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-fg">{r.usuario_nombre}</p>
                        <p className="text-xs text-fg-muted">
                          {r.oportunidad_titulo} · {formatDate(r.fecha)}
                        </p>
                      </div>
                      <Stars value={r.calificacion} />
                    </div>
                    {r.resena && <p className="mt-3 text-sm text-fg-secondary">{r.resena}</p>}
                  </Card>
                ))}
              </div>
            ))}
        </div>

        <aside className="space-y-6">
          <Card className="space-y-4 p-6 text-sm">
            <h2 className="font-semibold text-fg">Información</h2>
            {o.email_contacto && (
              <a href={`mailto:${o.email_contacto}`} className="flex items-center gap-2.5 text-fg-secondary hover:text-brand">
                <Mail className="h-4 w-4 text-fg-muted" /> {o.email_contacto}
              </a>
            )}
            {o.telefono_contacto && (
              <a href={`tel:${o.telefono_contacto}`} className="flex items-center gap-2.5 text-fg-secondary hover:text-brand">
                <Phone className="h-4 w-4 text-fg-muted" /> {o.telefono_contacto}
              </a>
            )}
            {o.sitio_web && (
              <a href={o.sitio_web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-fg-secondary hover:text-brand">
                <Globe className="h-4 w-4 text-fg-muted" /> <span className="truncate">{o.sitio_web.replace(/^https?:\/\//, "")}</span>
              </a>
            )}
            {o.fecha_creacion && (
              <p className="flex items-center gap-2.5 text-fg-secondary">
                <CalendarDays className="h-4 w-4 text-fg-muted" /> Fundada el {formatDate(o.fecha_creacion)}
              </p>
            )}
            <p className="flex items-center gap-2.5 text-fg-secondary">
              <Users className="h-4 w-4 text-fg-muted" /> {o.total_postulaciones ?? 0} postulaciones recibidas
            </p>
            {!!o.redes_sociales.length && (
              <div className="border-t border-border pt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-fg-muted">Redes sociales</p>
                {o.redes_sociales.map((r) => (
                  <a key={r} href={r.startsWith("http") ? r : `https://${r}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 truncate py-1 text-brand hover:underline">
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{r}</span>
                  </a>
                ))}
              </div>
            )}
          </Card>
          {!!o.certificacion.length && (
            <Card className="p-6">
              <h2 className="mb-3 font-semibold text-fg">Certificaciones</h2>
              <ul className="space-y-2 text-sm">
                {o.certificacion.map((c) => (
                  <li key={c.archivo}>
                    <a href={fileUrl.certificacionOrg(o.id, c.archivo)} className="flex items-center gap-2 text-fg-secondary hover:text-brand">
                      <Award className="h-4 w-4 text-amber-500" /> {c.nombre}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {resenas.data && resenas.data.length > 0 && o.calificacion_promedio != null && (
            <Card className="p-6 text-center">
              <p className="text-4xl font-bold text-fg">{o.calificacion_promedio}</p>
              <div className="mt-2 flex justify-center">
                <Stars value={o.calificacion_promedio} size={20} />
              </div>
              <p className="mt-2 text-xs text-fg-muted">Calificación de sus voluntarios</p>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
