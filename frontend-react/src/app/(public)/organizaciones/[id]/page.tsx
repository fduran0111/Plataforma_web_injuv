"use client";

import { Award, CalendarDays, ExternalLink, Globe, Mail, MapPin, MessageSquareQuote, Phone, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Stagger, StaggerItem } from "@/components/home/Stagger";
import OportunidadCard from "@/components/oportunidades/OportunidadCard";
import Entrada from "@/components/public/Entrada";
import { Avatar, Card, EmptyState, ErrorState, Spinner, Stars, Tabs } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useOportunidadesPostuladas } from "@/hooks/useMisPostulaciones";
import { fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Oportunidad, Organizacion, ResenaOrganizacion } from "@/lib/types";

function Cifra({ label, value, i }: { label: string; value: React.ReactNode; i: number }) {
  return (
    <div className="cifra-banda" style={{ "--i": i } as React.CSSProperties}>
      <p className="font-display text-[clamp(2.25rem,1.6rem+2vw,3.5rem)] leading-none tabular-nums tracking-[-0.02em] text-papel">{value}</p>
      <p className="mt-2 text-sm text-papel/65">{label}</p>
    </div>
  );
}

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
  const meta = [o.tipo_org, o.area_trabajo].filter(Boolean).join(" · ");

  return (
    <>
      {/* Banda de tinta: identidad y cifras */}
      <section className="bg-tinta text-papel">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-10 sm:px-6 lg:px-8 lg:pb-20 lg:pt-14">
          <div className="grid gap-x-8 gap-y-12 lg:grid-cols-12 lg:items-end">
            <Entrada className="lg:col-span-7">
              <Avatar name={o.nombre} src={o.tiene_logo ? fileUrl.logo(o.id, o.logo_version) : null} size={144} className="ring-4 ring-papel/15" />
              <h1 className="mt-8 max-w-[16ch] font-display text-[clamp(2.5rem,1.3rem+4vw,5.25rem)] leading-[0.96] tracking-[-0.03em] text-papel [text-wrap:balance]">
                {o.nombre}
              </h1>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-base text-papel/80">
                {meta && <span>{meta}</span>}
                {ubicacion && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-ambar" /> {ubicacion}
                  </span>
                )}
              </div>
            </Entrada>
            <div className="grid grid-cols-3 gap-6 lg:col-span-5 lg:justify-self-end lg:gap-10">
              <Cifra i={0} label={abiertas.length === 1 ? "voluntariado abierto" : "voluntariados abiertos"} value={ops.data ? abiertas.length : "—"} />
              <Cifra i={1} label="postulaciones recibidas" value={o.total_postulaciones ?? 0} />
              <Cifra
                i={2}
                label={o.calificacion_promedio != null ? "calificación de voluntarios" : "sin calificaciones aún"}
                value={o.calificacion_promedio != null ? o.calificacion_promedio : "—"}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-20">
        <div className="space-y-12 lg:col-span-7">
          <Entrada as="section" retraso={0.2}>
            <h2 className="text-h2 text-fg">Sobre la organización</h2>
            <p className="prose-text mt-5 max-w-[62ch] text-lg leading-[1.7] text-fg-secondary">
              {o.descripcion || "Esta organización aún no agrega una descripción."}
            </p>
          </Entrada>

          <Entrada as="section" retraso={0.3}>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "voluntariados", label: "Voluntariados", count: ops.data?.length },
                { value: "resenas", label: "Reseñas", count: resenas.data?.length },
              ]}
            />

            <div className="mt-6">
              {tab === "voluntariados" &&
                (ops.loading && !ops.data ? (
                  <Spinner />
                ) : !ops.data?.length ? (
                  <EmptyState icon={Users} title="Aún no publica voluntariados" />
                ) : (
                  <div className="space-y-10">
                    {!!abiertas.length && (
                      <Stagger className="grid gap-5 sm:grid-cols-2" stagger={0.06}>
                        {abiertas.map((op) => (
                          <StaggerItem key={op.id} className="h-full">
                            <OportunidadCard op={op} postulado={postuladas.has(op.id)} />
                          </StaggerItem>
                        ))}
                      </Stagger>
                    )}
                    {!!cerradas.length && (
                      <div>
                        <h3 className="text-h3 text-fg-muted">Voluntariados anteriores</h3>
                        <Stagger className="mt-4 grid gap-5 opacity-80 sm:grid-cols-2" stagger={0.06}>
                          {cerradas.map((op) => (
                            <StaggerItem key={op.id} className="h-full">
                              <OportunidadCard op={op} />
                            </StaggerItem>
                          ))}
                        </Stagger>
                      </div>
                    )}
                  </div>
                ))}

              {tab === "resenas" &&
                (!resenas.data?.length ? (
                  <EmptyState icon={MessageSquareQuote} title="Todavía no hay reseñas públicas" />
                ) : (
                  <Stagger className="grid gap-5 sm:grid-cols-2" stagger={0.06}>
                    {resenas.data.map((r) => (
                      <StaggerItem key={r.postulacion_id} className="h-full">
                        <figure className="flex h-full flex-col rounded-2xl bg-surface p-6 ring-1 ring-tinta/10">
                          <div className="flex items-center justify-between gap-3">
                            <Stars value={r.calificacion} />
                            <span aria-hidden className="font-display text-4xl leading-none text-ambar">
                              “
                            </span>
                          </div>
                          {r.resena && (
                            <blockquote className="mt-3 flex-1 font-display text-lg leading-snug text-fg [font-variation-settings:'wght'_480,'opsz'_18]">
                              “{r.resena}”
                            </blockquote>
                          )}
                          <figcaption className="mt-5 min-w-0 border-t border-tinta/15 pt-4">
                            <p className="truncate text-sm font-semibold text-fg">{r.usuario_nombre}</p>
                            <p className="truncate text-xs text-fg-muted">
                              {r.oportunidad_titulo} · {formatDate(r.fecha)}
                            </p>
                          </figcaption>
                        </figure>
                      </StaggerItem>
                    ))}
                  </Stagger>
                ))}
            </div>
          </Entrada>
        </div>

        <Entrada as="aside" retraso={0.35} className="space-y-6 lg:col-span-4 lg:col-start-9">
          <Card className="space-y-4 p-6 text-sm">
            <h2 className="text-h3 text-fg">Información</h2>
            {o.email_contacto && (
              <a href={`mailto:${o.email_contacto}`} className="flex items-center gap-2.5 break-all text-fg-secondary transition-colors hover:text-brand">
                <Mail className="h-4 w-4 shrink-0 text-fg-muted" /> {o.email_contacto}
              </a>
            )}
            {o.telefono_contacto && (
              <a href={`tel:${o.telefono_contacto}`} className="flex items-center gap-2.5 text-fg-secondary transition-colors hover:text-brand">
                <Phone className="h-4 w-4 text-fg-muted" /> {o.telefono_contacto}
              </a>
            )}
            {o.sitio_web && (
              <a href={o.sitio_web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-fg-secondary transition-colors hover:text-brand">
                <Globe className="h-4 w-4 shrink-0 text-fg-muted" /> <span className="truncate">{o.sitio_web.replace(/^https?:\/\//, "")}</span>
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
              <div className="border-t-[1.5px] border-dashed border-tinta/25 pt-4">
                <p className="mb-2 text-sm font-semibold text-fg">Redes sociales</p>
                {o.redes_sociales.map((r) => (
                  <a
                    key={r}
                    href={r.startsWith("http") ? r : `https://${r}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 truncate py-1 text-brand underline-offset-4 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{r}</span>
                  </a>
                ))}
              </div>
            )}
          </Card>

          {!!o.certificacion.length && (
            <Card className="p-6">
              <h2 className="text-h3 text-fg">Certificaciones</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {o.certificacion.map((c) => (
                  <li key={c.archivo}>
                    <a href={fileUrl.certificacionOrg(o.id, c.archivo)} className="flex items-center gap-2 text-fg-secondary transition-colors hover:text-brand">
                      <Award className="h-4 w-4 shrink-0 text-ambar" /> {c.nombre}
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {resenas.data && resenas.data.length > 0 && o.calificacion_promedio != null && (
            <div className="rounded-2xl bg-tinta p-6 text-papel">
              <p className="font-display text-6xl leading-none tabular-nums tracking-[-0.03em]">{o.calificacion_promedio}</p>
              <div className="mt-3">
                <Stars value={o.calificacion_promedio} size={20} />
              </div>
              <p className="mt-3 text-sm font-medium text-papel/70">
                Calificación de {resenas.data.length} {resenas.data.length === 1 ? "voluntario" : "voluntarios"}
              </p>
            </div>
          )}
        </Entrada>
      </div>
    </>
  );
}
