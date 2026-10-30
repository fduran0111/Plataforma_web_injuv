"use client";

import { MessageSquareQuote } from "lucide-react";
import { Badge, Card, EmptyState, ErrorState, PageHeader, Spinner, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/format";
import type { ResenaAdmin } from "@/lib/types";

export default function AdminResenasPage() {
  const { data, loading, error, reload } = useApi<ResenaAdmin[]>("/admin/resenas");

  return (
    <>
      <PageHeader title="Reseñas" description="Evaluaciones cruzadas entre voluntarios y organizaciones." />
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
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase text-fg-muted">
                    Del voluntario
                    <Badge tone={r.resena_usuario_publica ? "green" : "slate"}>{r.resena_usuario_publica ? "Pública" : "Oculta"}</Badge>
                  </p>
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
