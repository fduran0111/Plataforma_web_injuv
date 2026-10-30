"use client";

import { MessageSquareQuote } from "lucide-react";
import { Card, EmptyState, ErrorState, PageHeader, Spinner, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/format";
import type { ResenaOrganizacion } from "@/lib/types";

export default function ResenasOrgPage() {
  const { data, loading, error, reload } = useApi<ResenaOrganizacion[]>("/organizaciones/mia/resenas");

  return (
    <>
      <PageHeader title="Reseñas de voluntarios" description="Lo que cuentan los voluntarios que participaron en tus actividades." />
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
            <p className="mt-3 text-xs text-fg-muted">{r.es_publica ? "Visible en tu perfil público" : "Solo visible para ti"}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
