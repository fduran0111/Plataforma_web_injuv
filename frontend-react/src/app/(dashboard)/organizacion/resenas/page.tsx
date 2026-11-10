"use client";

import { useState } from "react";
import { Eye, EyeOff, MessageSquareQuote } from "lucide-react";
import { Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ResenaOrganizacion } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

export default function ResenasOrgPage() {
  const { data, loading, error, reload, setData } = useApi<ResenaOrganizacion[]>("/organizaciones/mia/resenas");
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);

  /** Publica u oculta la reseña en el perfil público de la organización (y en la portada). */
  async function toggleVisibilidad(r: ResenaOrganizacion) {
    setBusy(r.postulacion_id);
    try {
      const updated = await apiFetch<{ resena_usuario_publica: boolean }>(`/postulaciones/${r.postulacion_id}/visibilidad-resena`, {
        method: "PATCH",
        body: { es_publica: !r.es_publica },
      });
      setData((prev) => (prev ?? []).map((x) => (x.postulacion_id === r.postulacion_id ? { ...x, es_publica: updated.resena_usuario_publica } : x)));
      toast(updated.resena_usuario_publica ? "Reseña publicada en tu perfil" : "Reseña ocultada del perfil público");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Reseñas de voluntarios"
        description="Lo que cuentan los voluntarios que participaron en tus actividades. Tú decides cuáles se ven en tu perfil público."
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && (
        <EmptyState icon={MessageSquareQuote} title="Todavía no hay reseñas" description="Aparecerán aquí cuando los voluntarios evalúen su experiencia." />
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {data?.map((r) => (
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
              <p className="text-xs text-fg-muted">{r.es_publica ? "Visible en tu perfil público" : "Solo visible para ti"}</p>
              <Button size="sm" variant={r.es_publica ? "ghost" : "outline"} loading={busy === r.postulacion_id} onClick={() => toggleVisibilidad(r)}>
                {r.es_publica ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {r.es_publica ? "Ocultar" : "Publicar"}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
