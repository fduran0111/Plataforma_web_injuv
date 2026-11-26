"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownUp, CheckCircle2, FileCheck2, Flag, Mail, MessageSquareQuote, Phone, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Input, Modal, PageHeader, Paginacion, Spinner, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, downloadFile, fileUrl } from "@/lib/api";
import { MOTIVOS_REPORTE_RESENA } from "@/lib/constants";
import { formatDate, formatRut } from "@/lib/format";
import type { FichaPostulante, ResenaAdmin } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

const POR_PAGINA = 10;

const normalizar = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function BotonBorrar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-red-200 bg-surface px-3 text-xs font-semibold text-red-600 transition-[background-color,color,border-color,transform] duration-150 hover:border-red-600 hover:bg-red-600 hover:text-white active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
    >
      <Trash2 className="h-3.5 w-3.5" /> Borrar
    </button>
  );
}

/** Perfil del voluntario que escribió la reseña (misma ficha que ve la organización del postulante). */
function PerfilVoluntario({ r, onClose }: { r: ResenaAdmin | null; onClose: () => void }) {
  const toast = useToast();
  const [ficha, setFicha] = useState<{ id: number; datos: FichaPostulante } | null>(null);
  const datos = r && ficha?.id === r.id ? ficha.datos : null;
  const datosFicha = datos
    ? [
        ["RUT", datos.rut ? formatRut(datos.rut) : ""],
        ["Edad", datos.edad != null ? `${datos.edad} años` : ""],
        ["Nacimiento", datos.fecha_nacimiento ? formatDate(datos.fecha_nacimiento) : ""],
        ["Sexo", datos.sexo],
        ["Provincia", datos.ciudad],
        ["Comuna", datos.comuna],
      ].filter(([, v]) => v)
    : [];

  useEffect(() => {
    if (!r || ficha?.id === r.id) return;
    apiFetch<FichaPostulante>(`/postulaciones/${r.id}/ficha`)
      .then((d) => setFicha({ id: r.id, datos: d }))
      .catch((e: Error) => {
        toast(e.message, "error");
        onClose();
      });
  }, [r, ficha, toast, onClose]);

  return (
    <Modal open={!!r} onClose={onClose} title="Perfil del voluntario" size="lg">
      {!datos || !r ? (
        <Spinner label="Cargando perfil…" />
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={datos.nombre} src={datos.tiene_foto ? fileUrl.foto(r.usuario_id) : null} size={72} />
            <div className="min-w-0">
              <p className="font-display text-2xl leading-tight text-fg">{datos.nombre}</p>
              <p className="mt-1 text-sm text-fg-muted">{[datos.comuna, datos.region].filter(Boolean).join(", ")}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {datos.email && (
                  <a href={`mailto:${datos.email}`} className="inline-flex items-center gap-1.5 text-brand hover:underline">
                    <Mail className="h-4 w-4" /> {datos.email}
                  </a>
                )}
                {datos.telefono && (
                  <a href={`tel:${datos.telefono}`} className="inline-flex items-center gap-1.5 text-brand hover:underline">
                    <Phone className="h-4 w-4" /> {datos.telefono}
                  </a>
                )}
              </div>
            </div>
          </div>
          {datosFicha.length > 0 && (
            <dl className="grid gap-x-6 gap-y-3 rounded-xl bg-papel-strong/60 p-4 text-sm sm:grid-cols-3">
              {datosFicha.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-fg-muted">{k}</dt>
                  <dd className="mt-0.5 text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Certificados</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {datos.certificados.length === 0 && <p className="text-sm text-fg-muted">No ha subido certificados de antecedentes ni inhabilidades.</p>}
              {datos.certificados.map((c) => (
                <Button key={c.tipo} size="sm" variant="outline" onClick={() => downloadFile(`/postulaciones/${r.id}/certificado-personal/${c.tipo}`, `${c.tipo}.pdf`)}>
                  <FileCheck2 className="h-4 w-4" /> {c.tipo === "antecedentes" ? "Antecedentes" : "Inhabilidades"}
                  {c.fecha_emision ? ` (${formatDate(c.fecha_emision)})` : ""}
                </Button>
              ))}
            </div>
          </div>
          <p className="border-t border-border pt-4 text-xs text-fg-muted">
            Reseña en “{r.oportunidad_titulo}” para {r.organizacion_nombre} · {formatDate(r.updated_at)}
          </p>
        </div>
      )}
    </Modal>
  );
}

export default function AdminResenasPage() {
  const { data, loading, error, reload, setData } = useApi<ResenaAdmin[]>("/admin/resenas");
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [antiguas, setAntiguas] = useState(false);
  const [soloReportadas, setSoloReportadas] = useState(false);
  const [verReporte, setVerReporte] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [perfil, setPerfil] = useState<ResenaAdmin | null>(null);
  const cerrarPerfil = useCallback(() => setPerfil(null), []);
  const [borrar, setBorrar] = useState<{ r: ResenaAdmin; tipo: "voluntario" | "organizacion" } | null>(null);

  const nReportadas = useMemo(() => (data ?? []).filter((r) => r.reportes.length > 0).length, [data]);

  const vista = useMemo(() => {
    const q = normalizar(busqueda.trim());
    const ms = (r: ResenaAdmin) => (r.updated_at ? new Date(r.updated_at).getTime() : 0);
    const lista = (data ?? []).filter(
      (r) =>
        (!soloReportadas || nReportadas === 0 || r.reportes.length > 0) &&
        (!q || [r.usuario_nombre, r.organizacion_nombre, r.oportunidad_titulo, r.resena_usuario, r.resena_org].some((t) => normalizar(t).includes(q))),
    );
    return lista.sort((a, b) => (antiguas ? ms(a) - ms(b) : ms(b) - ms(a)));
  }, [data, busqueda, antiguas, soloReportadas, nReportadas]);
  const totalPaginas = Math.max(1, Math.ceil(vista.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = vista.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const irAPagina = (n: number) => {
    setPagina(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  async function confirmarBorrar() {
    if (!borrar) return;
    const { r, tipo } = borrar;
    setBusy(r.id);
    try {
      await apiFetch(`/admin/resenas/${r.id}?tipo=${tipo}`, { method: "DELETE" });
      setData((prev) =>
        (prev ?? [])
          .map((x) =>
            x.id !== r.id ? x : tipo === "voluntario" ? { ...x, resena_usuario: "", calificacion_usuario: null, reportes: [] } : { ...x, resena_org: "", calificacion_org: null },
          )
          .filter((x) => x.resena_usuario || x.calificacion_usuario != null || x.resena_org || x.calificacion_org != null),
      );
      toast("Reseña borrada");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
      setBorrar(null);
    }
  }

  async function descartarReporte(r: ResenaAdmin) {
    setBusy(r.id);
    try {
      await apiFetch(`/admin/resenas/${r.id}/descartar-reporte`, { method: "POST" });
      setData((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, reportes: [] } : x)));
      toast("Reporte descartado");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Reseñas"
        description="Evaluaciones entre voluntarios y organizaciones. Borra las que tengan contenido indebido. Las reseñas públicas de voluntarios se ven en el perfil de la organización y puedes elegir cuáles salen en el inicio desde Apariencia."
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={MessageSquareQuote} title="Aún no hay reseñas" />}
      {!!data?.length && (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
              <Input
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value);
                  setPagina(1);
                }}
                placeholder="Buscar por organización, voluntario, voluntariado o texto"
                aria-label="Buscar reseñas"
                className="pl-10"
              />
            </div>
            <button type="button" className="ficha h-11 px-4" aria-pressed={antiguas} onClick={() => {
                setAntiguas((v) => !v);
                setPagina(1);
              }}>
              <ArrowDownUp className="h-4 w-4" /> Más antiguas primero
            </button>
            <button
              type="button"
              className="ficha h-11 px-4 disabled:pointer-events-none disabled:opacity-50"
              aria-pressed={soloReportadas && nReportadas > 0}
              disabled={nReportadas === 0}
              title={nReportadas === 0 ? "No hay reseñas reportadas pendientes" : undefined}
              onClick={() => {
                setSoloReportadas((v) => !v);
                setPagina(1);
              }}
            >
              <Flag className="h-4 w-4" /> Reportadas{" "}
              <span className={nReportadas > 0 ? "rounded-full bg-red-600 px-1.5 text-xs leading-5 text-white tabular-nums" : "tabular-nums"}>{nReportadas}</span>
            </button>
            <span className="ml-auto rounded-full bg-tinta/[0.06] px-3 py-1 text-sm font-semibold text-fg-secondary tabular-nums">
              {vista.length} {vista.length === 1 ? "reseña" : "reseñas"}
            </span>
          </div>
          {vista.length === 0 ? (
            <EmptyState icon={MessageSquareQuote} title="No hay reseñas con esa búsqueda" />
          ) : (
            <Card className="divide-y divide-tinta/10 overflow-hidden p-0">
              {visibles.map((r) => (
                <article key={r.id} className="flex gap-4 px-5 py-4 transition-colors duration-150 hover:bg-papel-strong/40 sm:px-6">
                  <button type="button" onClick={() => setPerfil(r)} aria-label={`Ver perfil de ${r.usuario_nombre}`} className="mt-0.5 shrink-0 self-start rounded-full transition-transform duration-150 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
                    <Avatar name={r.usuario_nombre} size={40} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-fg-secondary">
                          <button type="button" onClick={() => setPerfil(r)} className="font-semibold text-fg underline-offset-2 hover:underline">
                            {r.usuario_nombre}
                          </button>{" "}
                          para{" "}
                          {r.organizacion_id != null ? (
                            <Link href={`/organizaciones/${r.organizacion_id}`} target="_blank" className="font-semibold text-brand underline-offset-2 hover:underline">
                              {r.organizacion_nombre}
                            </Link>
                          ) : (
                            <strong className="font-semibold text-brand">{r.organizacion_nombre}</strong>
                          )}
                          {r.resena_usuario && !r.resena_usuario_publica && (
                            <Badge tone="slate" className="ml-2 align-middle">Privada</Badge>
                          )}
                          {r.reportes.length > 0 && (
                            <button
                              type="button"
                              aria-expanded={verReporte === r.id}
                              onClick={() => setVerReporte((v) => (v === r.id ? null : r.id))}
                              className="ml-2 inline-flex items-center gap-1 rounded-sm bg-red-50 px-2 py-0.5 align-middle text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-200 transition-colors hover:bg-red-100"
                            >
                              <Flag className="h-3 w-3" /> Reportada · {verReporte === r.id ? "ocultar motivo" : "ver motivo"}
                            </button>
                          )}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-fg-muted">
                          {r.oportunidad_titulo} · {formatDate(r.updated_at)}
                        </p>
                      </div>
                      {(r.resena_usuario || r.calificacion_usuario != null) && <BotonBorrar onClick={() => setBorrar({ r, tipo: "voluntario" })} />}
                    </div>
                    {(r.resena_usuario || r.calificacion_usuario != null) && (
                      <div className="mt-2.5">
                        <Stars value={r.calificacion_usuario} size={15} />
                        {r.resena_usuario && <p className="mt-1.5 max-w-[75ch] text-[0.9375rem] leading-relaxed text-fg">“{r.resena_usuario}”</p>}
                      </div>
                    )}
                    {r.reportes.length > 0 && verReporte === r.id && (
                      <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-red-200">
                        {r.reportes.map((rep) => (
                          <p key={rep.id} className="text-xs text-red-900">
                            {rep.reportado_por_nombre && <><strong>{rep.reportado_por_nombre}</strong> · </>}{MOTIVOS_REPORTE_RESENA[rep.motivo as keyof typeof MOTIVOS_REPORTE_RESENA] ?? rep.motivo} · {formatDate(rep.created_at)}
                            {rep.detalle && <> — {rep.detalle}</>}
                          </p>
                        ))}
                        <div className="mt-2">
                          <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => descartarReporte(r)}>
                            <CheckCircle2 className="h-4 w-4" /> Descartar reporte
                          </Button>
                        </div>
                      </div>
                    )}
                    {(r.resena_org || r.calificacion_org != null) && (
                      <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-papel-strong/70 px-4 py-3">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-fg-muted">
                            La organización sobre el voluntario
                            {r.calificacion_org != null && <Stars value={r.calificacion_org} size={12} />}
                            <Badge tone={r.resena_org_publica ? "green" : "slate"}>{r.resena_org_publica ? "Visible" : "Privada"}</Badge>
                          </p>
                          {r.resena_org && <p className="mt-1 text-sm text-fg-secondary">{r.resena_org}</p>}
                        </div>
                        <BotonBorrar onClick={() => setBorrar({ r, tipo: "organizacion" })} />
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </Card>
          )}
          <Paginacion pagina={paginaActual} total={totalPaginas} onChange={irAPagina} className="mt-6" />
        </>
      )}
      <PerfilVoluntario r={perfil} onClose={cerrarPerfil} />
      <ConfirmModal
        open={!!borrar}
        title="Borrar reseña"
        confirmLabel="Borrar"
        danger
        loading={busy != null}
        message={
          borrar
            ? `Se borrará el comentario y la calificación de ${borrar.tipo === "voluntario" ? borrar.r.usuario_nombre : borrar.r.organizacion_nombre} en “${borrar.r.oportunidad_titulo}”. Esta acción no se puede deshacer.`
            : ""
        }
        onClose={() => setBorrar(null)}
        onConfirm={confirmarBorrar}
      />
    </>
  );
}
