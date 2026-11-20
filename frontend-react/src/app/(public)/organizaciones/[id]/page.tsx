"use client";

import { Award, CalendarDays, ExternalLink, Globe, Mail, MapPin, Phone, SlidersHorizontal, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Stagger, StaggerItem } from "@/components/home/Stagger";
import OportunidadCard from "@/components/oportunidades/OportunidadCard";
import Entrada from "@/components/public/Entrada";
import { Avatar, Card, EmptyState, ErrorState, Spinner, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useOportunidadesPostuladas } from "@/hooks/useMisPostulaciones";
import { fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useReducedMotion } from "@/lib/motion";
import type { Oportunidad, Organizacion, ResenaOrganizacion } from "@/lib/types";

function Cifra({ label, value, i }: { label: string; value: React.ReactNode; i: number }) {
  return (
    <div className="cifra-banda" style={{ "--i": i } as React.CSSProperties}>
      <p className="font-display text-[clamp(2.25rem,1.6rem+2vw,3.5rem)] leading-none tabular-nums tracking-[-0.02em] text-papel">{value}</p>
      <p className="mt-2 text-sm text-papel/65">{label}</p>
    </div>
  );
}

const POR_PAGINA = 4;
type FiltroEstado = "abiertos" | "anteriores" | "todos";

export default function OrganizacionPage() {
  const { id } = useParams<{ id: string }>();
  const org = useApi<Organizacion>(`/organizaciones/${id}`);
  const ops = useApi<Oportunidad[]>(`/oportunidades?organizacion_id=${id}&estado=todas`);
  const resenas = useApi<ResenaOrganizacion[]>(`/organizaciones/${id}/resenas`);
  const postuladas = useOportunidadesPostuladas();
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstado | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [visibles, setVisibles] = useState(POR_PAGINA);
  const [verFiltros, setVerFiltros] = useState(false);
  function filtrar(e: FiltroEstado, a: string | null) {
    setEstadoFiltro(e);
    setArea(a);
    setVisibles(POR_PAGINA);
  }

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
  const estadoInicial: FiltroEstado = abiertas.length || !cerradas.length ? "abiertos" : "anteriores";
  const estadoActivo: FiltroEstado = estadoFiltro ?? estadoInicial;
  const filtrosActivos = Number(estadoActivo !== estadoInicial) + Number(!!area);
  const porEstado = estadoActivo === "abiertos" ? abiertas : estadoActivo === "anteriores" ? cerradas : (ops.data ?? []);
  const areas = [...new Set(porEstado.map((op) => op.tipo_de_voluntariado).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  const filtradas = area ? porEstado.filter((op) => op.tipo_de_voluntariado === area) : porEstado;
  const ubicacion = [o.comuna, o.ciudad, o.region].filter(Boolean).join(", ");
  const meta = [o.tipo_org, o.area_trabajo].filter(Boolean).join(" · ");

  return (
    <>
      {/* Banda de tinta: identidad y cifras */}
      <section className="relative isolate overflow-hidden bg-tinta text-papel">
        {o.tiene_banner && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fileUrl.banner(o.id, o.banner_version)} alt="" className="portada-foto absolute inset-0 -z-10 h-full w-full object-cover" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-tinta via-tinta/75 to-tinta/25" />
            <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-tinta/70 to-transparent" />
          </>
        )}
        <div className={`mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8 lg:pb-20 ${o.tiene_banner ? "pt-40 sm:pt-56 lg:pt-72" : "pt-10 lg:pt-14"}`}>
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

      <div className="mx-auto grid max-w-7xl gap-x-10 gap-y-12 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-20">
        <div className="min-w-0 space-y-14 lg:col-span-8">
          <Entrada as="section" retraso={0.2}>
            <h2 className="text-h2 text-fg">Sobre la organización</h2>
            <p className="prose-text mt-5 max-w-[62ch] text-lg leading-[1.7] text-fg-secondary">
              {o.descripcion || "Esta organización aún no agrega una descripción."}
            </p>
          </Entrada>

          <Entrada as="section" retraso={0.3}>
            <div className="flex items-end justify-between gap-4 border-b border-tinta/15 pb-4">
              <div>
                <h2 className="text-h2 text-fg">Voluntariados</h2>
                {!!ops.data?.length && (
                  <p className="mt-1 text-sm text-fg-muted">
                    {filtradas.length} de {ops.data.length} {ops.data.length === 1 ? "publicado" : "publicados"}
                  </p>
                )}
              </div>
              {!!ops.data?.length && (
                <button
                  type="button"
                  className="ficha"
                  aria-expanded={verFiltros}
                  aria-controls="filtros-voluntariados"
                  aria-pressed={verFiltros}
                  onClick={() => setVerFiltros((v) => !v)}
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filtros
                  {filtrosActivos > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ambar px-1 text-xs tabular-nums text-tinta">{filtrosActivos}</span>
                  )}
                </button>
              )}
            </div>
            {ops.loading && !ops.data ? (
              <Spinner className="mt-8" />
            ) : !ops.data?.length ? (
              <div className="mt-8">
                <EmptyState icon={Users} title="Aún no publica voluntariados" />
              </div>
            ) : (
              <>
                {verFiltros && (
                <div id="filtros-voluntariados" className="panel-filtros mt-6 space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-tinta/10">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-fg">Estado</p>
                    {filtrosActivos > 0 && (
                      <button type="button" onClick={() => filtrar(estadoInicial, null)} className="text-sm font-semibold text-brand underline-offset-4 hover:underline">
                        Limpiar filtros
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estado">
                    {(
                      [
                        ["abiertos", "Abiertos", abiertas.length],
                        ["anteriores", "Anteriores", cerradas.length],
                        ["todos", "Todos", ops.data.length],
                      ] as const
                    ).map(([v, label, n]) => (
                      <button key={v} type="button" className="ficha disabled:pointer-events-none disabled:opacity-40" disabled={n === 0} aria-pressed={estadoActivo === v} onClick={() => filtrar(v, null)}>
                        {label} <span className="tabular-nums opacity-60">{n}</span>
                      </button>
                    ))}
                  </div>
                  {areas.length > 1 && (
                    <>
                    <p className="text-sm font-semibold text-fg">Área</p>
                    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por área">
                      <button type="button" className="ficha h-8 text-xs" aria-pressed={!area} onClick={() => filtrar(estadoActivo, null)}>
                        Todas las áreas
                      </button>
                      {areas.map((a) => (
                        <button key={a} type="button" className="ficha h-8 text-xs" aria-pressed={area === a} onClick={() => filtrar(estadoActivo, a)}>
                          {a}
                        </button>
                      ))}
                    </div>
                    </>
                  )}
                </div>
                )}

                <div className="mt-8">
                  {!filtradas.length ? (
                    <EmptyState icon={Users} title="No hay voluntariados con estos filtros" />
                  ) : (
                    <div key={`${estadoActivo}-${area}-${filtradas.length}`} className="space-y-6">
                      {Array.from({ length: Math.ceil(Math.min(visibles, filtradas.length) / POR_PAGINA) }, (_, t) => (
                        <Stagger key={t} className="grid gap-6 sm:grid-cols-2" stagger={0.06}>
                          {filtradas.slice(t * POR_PAGINA, Math.min((t + 1) * POR_PAGINA, visibles)).map((op) => (
                            <StaggerItem key={op.id} className={`h-full ${op.estado === "cerrada" ? "opacity-80" : ""}`}>
                              <OportunidadCard op={op} postulado={postuladas.has(op.id)} />
                            </StaggerItem>
                          ))}
                        </Stagger>
                      ))}
                    </div>
                  )}
                  {filtradas.length > visibles && (
                    <div className="mt-8 flex justify-center">
                      <button type="button" className="ficha" onClick={() => setVisibles((v) => v + POR_PAGINA)}>
                        Ver más voluntariados <span className="tabular-nums opacity-60">{filtradas.length - visibles}</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </Entrada>
        </div>

        <Entrada as="aside" retraso={0.35} className="min-w-0 space-y-6 lg:col-span-4">
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

          <section className="overflow-hidden rounded-2xl bg-surface ring-1 ring-tinta/10">
            <div className="bg-tinta p-6 text-papel">
              <h2 className="text-h3 text-papel">Reseñas de voluntarios</h2>
              {o.calificacion_promedio != null && !!resenas.data?.length ? (
                <div className="mt-4 flex items-end gap-4">
                  <p className="font-display text-5xl leading-none tabular-nums tracking-[-0.03em]">{o.calificacion_promedio}</p>
                  <div className="pb-1">
                    <Stars value={o.calificacion_promedio} size={18} />
                    <p className="mt-1 text-xs font-medium text-papel/70">
                      {resenas.data.length} {resenas.data.length === 1 ? "reseña" : "reseñas"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-papel/70">Todavía no hay reseñas públicas.</p>
              )}
            </div>
            {!!resenas.data?.length && <ResenasRotativas resenas={resenas.data.slice(0, 10)} />}
          </section>
        </Entrada>
      </div>
    </>
  );
}

function ResenaItem({ r }: { r: ResenaOrganizacion }) {
  return (
    <>
      <Stars value={r.calificacion} size={14} />
      {r.resena && <blockquote className="mt-2 line-clamp-4 text-sm leading-relaxed text-fg">“{r.resena}”</blockquote>}
      <p className="mt-3 truncate text-xs font-semibold text-fg">{r.usuario_nombre}</p>
      <p className="truncate text-xs text-fg-muted">
        {r.oportunidad_titulo} · {formatDate(r.fecha)}
      </p>
    </>
  );
}

/** De a dos reseñas: cambian solas con un fundido lento; se pausa con el mouse encima o si la pestaña no se ve. */
function ResenasRotativas({ resenas }: { resenas: ResenaOrganizacion[] }) {
  const reduced = useReducedMotion();
  const [activa, setActiva] = useState(0);
  const [pausa, setPausa] = useState(false);
  const grupos: ResenaOrganizacion[][] = [];
  for (let i = 0; i < resenas.length; i += 2) grupos.push(resenas.slice(i, i + 2));
  const total = grupos.length;

  useEffect(() => {
    if (total < 2 || pausa || reduced) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setActiva((i) => (i + 1) % total);
    }, 4500);
    return () => window.clearInterval(id);
  }, [total, pausa, reduced]);

  return (
    <div className="grid" aria-live="polite" onPointerEnter={() => setPausa(true)} onPointerLeave={() => setPausa(false)}>
      {grupos.map((g, i) => (
        <ul
          key={g[0].postulacion_id}
          aria-hidden={i !== activa}
          className={`divide-y divide-tinta/10 [grid-area:1/1] transition-opacity ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none ${
            i === activa ? "opacity-100 delay-[700ms] duration-[1000ms]" : "pointer-events-none opacity-0 duration-[700ms]"
          }`}
        >
          {g.map((r) => (
            <li key={r.postulacion_id} className="p-5">
              <ResenaItem r={r} />
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
