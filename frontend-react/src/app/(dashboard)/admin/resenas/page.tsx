"use client";

import { useState } from "react";
import { Eye, EyeOff, MessageSquareQuote } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { ResenaAdmin } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

export default function AdminResenasPage() {
  const { data, loading, error, reload, setData } = useApi<ResenaAdmin[]>("/admin/resenas");
  const toast = useToast();
  const [busy, setBusy] = useState<number | null>(null);

  /** Publica u oculta la reseña del voluntario en las vistas públicas (portada y perfil de la organización). */
  async function toggleVisibilidad(r: ResenaAdmin) {
    setBusy(r.id);
    try {
      const updated = await apiFetch<ResenaAdmin>(`/postulaciones/${r.id}/visibilidad-resena`, {
        method: "PATCH",
        body: { es_publica: !r.resena_usuario_publica },
      });
      setData((prev) => (prev ?? []).map((x) => (x.id === r.id ? { ...x, resena_usuario_publica: updated.resena_usuario_publica } : x)));
      toast(updated.resena_usuario_publica ? "Reseña publicada (visible en la portada y en el perfil de la organización)" : "Reseña ocultada");
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
        description="Evaluaciones cruzadas entre voluntarios y organizaciones. Las reseñas del voluntario marcadas como públicas aparecen en la portada y en el perfil de la organización."
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={MessageSquareQuote} title="Aún no hay reseñas" />}
      <div className="space-y-4">
        {data?.map((r) => (
          <Card key={r.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-fg-muted">
                <strong className="text-fg">{r.usuario_nombre}</strong> en <strong className="text-fg">{r.oportunidad_titulo}</strong> · {r.organizacion_nombre} · {formatDate(r.updated_at)}
              </p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {r.resena_usuario && (
                <div className="rounded-xl bg-page p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex items-center gap-2 text-xs font-semibold uppercase text-fg-muted">
                      Del voluntario
                      <Badge tone={r.resena_usuario_publica ? "green" : "slate"}>{r.resena_usuario_publica ? "Pública" : "Oculta"}</Badge>
                    </p>
                    <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => toggleVisibilidad(r)}>
                      {r.resena_usuario_publica ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {r.resena_usuario_publica ? "Ocultar" : "Publicar"}
                    </Button>
                  </div>
                  <div className="mt-1.5">
                    <Stars value={r.calificacion_usuario} />
                  </div>
                  <p className="mt-1.5 text-sm text-fg-secondary">{r.resena_usuario}</p>
                </div>
              )}
              {(r.resena_org || r.calificacion_org != null) && (
                <div className="rounded-xl border border-border p-4">
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-fg-muted">
                    De la organización
                    <Badge tone={r.resena_org_publica ? "green" : "slate"}>{r.resena_org_publica ? "Visible" : "Privada"}</Badge>
                  </p>
                  {r.calificacion_org != null && (
                    <div className="mt-1.5">
                      <Stars value={r.calificacion_org} />
                    </div>
                  )}
                  {r.resena_org && <p className="mt-1.5 text-sm text-fg-secondary">{r.resena_org}</p>}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
