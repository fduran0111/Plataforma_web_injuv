"use client";

import { useMemo, useState } from "react";
import { ArrowDownUp, Flag, MessageSquareQuote } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, Field, Modal, PageHeader, Paginacion, Spinner, Stars, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { MOTIVOS_REPORTE_RESENA } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { ResenaOrganizacion } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

const POR_PAGINA = 10;

export default function ResenasOrgPage() {
  const { data, loading, error, reload, setData } = useApi<ResenaOrganizacion[]>("/organizaciones/mia/resenas");
  const toast = useToast();
  const [reportando, setReportando] = useState<ResenaOrganizacion | null>(null);
  const [motivo, setMotivo] = useState<keyof typeof MOTIVOS_REPORTE_RESENA | null>(null);
  const [detalle, setDetalle] = useState("");
  const [busy, setBusy] = useState(false);
  const [antiguas, setAntiguas] = useState(false);
  const [pagina, setPagina] = useState(1);

  const ordenadas = useMemo(() => {
    const ms = (r: ResenaOrganizacion) => (r.fecha ? new Date(r.fecha).getTime() : 0);
    return [...(data ?? [])].sort((a, b) => (antiguas ? ms(a) - ms(b) : ms(b) - ms(a)));
  }, [data, antiguas]);
  const totalPaginas = Math.max(1, Math.ceil(ordenadas.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const visibles = ordenadas.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA);
  const irAPagina = (n: number) => {
    setPagina(n);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function abrirReporte(r: ResenaOrganizacion) {
    setMotivo(null);
    setDetalle("");
    setReportando(r);
  }

  async function enviarReporte() {
    if (!reportando || !motivo) return;
    setBusy(true);
    try {
      await apiFetch(`/postulaciones/${reportando.postulacion_id}/reportar-resena`, {
        method: "POST",
        body: { motivo, detalle: detalle.trim() || null },
      });
      setData((prev) => (prev ?? []).map((x) => (x.postulacion_id === reportando.postulacion_id ? { ...x, reporte_pendiente: true } : x)));
      toast("Reporte enviado. El equipo INJUV lo revisará.");
      setReportando(null);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  const invalido = !motivo || (motivo === "otro" && !detalle.trim());

  return (
    <>
      <PageHeader
        title="Reseñas de voluntarios"
        description="Lo que cuentan los voluntarios que participaron en tus actividades. Si una reseña tiene contenido indebido, repórtala y el equipo INJUV la revisará."
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && (
        <EmptyState icon={MessageSquareQuote} title="Todavía no hay reseñas" description="Aparecerán aquí cuando los voluntarios evalúen su experiencia." />
      )}
      {!!data?.length && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="ficha h-11 px-4"
            aria-pressed={antiguas}
            onClick={() => {
              setAntiguas((v) => !v);
              setPagina(1);
            }}
          >
            <ArrowDownUp className="h-4 w-4" /> Más antiguas primero
          </button>
          <span className="ml-auto rounded-full bg-tinta/[0.06] px-3 py-1 text-sm font-semibold text-fg-secondary tabular-nums">
            {data.length} {data.length === 1 ? "reseña" : "reseñas"}
          </span>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {visibles.map((r) => (
          <Card key={r.postulacion_id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-fg">{r.usuario_nombre}</p>
                <p className="text-xs text-fg-muted">
                  {r.oportunidad_titulo} · {formatDate(r.fecha)}
                </p>
              </div>
              <Stars value={r.calificacion} />
            </div>
            {r.resena && <p className="mt-3 text-sm text-fg-secondary">{r.resena}</p>}
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-fg-muted">{r.es_publica ? "Visible en tu perfil público" : "El voluntario la dejó privada"}</p>
              {r.reporte_pendiente ? (
                <Badge tone="amber">Reportada · en revisión</Badge>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => abrirReporte(r)}>
                  <Flag className="h-4 w-4" /> Reportar
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <Paginacion pagina={paginaActual} total={totalPaginas} onChange={irAPagina} className="mt-6" />
      <Modal
        open={!!reportando}
        onClose={() => setReportando(null)}
        title="Reportar reseña"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setReportando(null)}>Cancelar</Button>
            <Button onClick={enviarReporte} loading={busy} disabled={invalido}>Enviar reporte</Button>
          </div>
        }
      >
        {reportando && (
          <div className="space-y-4">
            <p className="rounded-xl bg-page px-4 py-3 text-sm text-fg-secondary line-clamp-3">“{reportando.resena}”</p>
            <div className="space-y-2">
              {(Object.keys(MOTIVOS_REPORTE_RESENA) as (keyof typeof MOTIVOS_REPORTE_RESENA)[]).map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-2 text-sm text-fg-secondary">
                  <input type="radio" name="motivo" className="h-4 w-4 accent-brand" checked={motivo === m} onChange={() => setMotivo(m)} />
                  {MOTIVOS_REPORTE_RESENA[m]}
                </label>
              ))}
            </div>
            <Field label={motivo === "otro" ? "Detalle" : "Detalle (opcional)"} required={motivo === "otro"}>
              {(id) => <Textarea id={id} value={detalle} onChange={(e) => setDetalle(e.target.value)} maxLength={500} rows={3} />}
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}
