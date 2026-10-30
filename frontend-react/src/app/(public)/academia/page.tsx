"use client";

import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { DocumentoCard } from "@/components/ContentCards";
import { EmptyState, ErrorState, Spinner, Tabs } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { CATEGORIAS_ACADEMIA } from "@/lib/constants";
import type { Documento } from "@/lib/types";

export default function AcademiaPage() {
  const { data, loading, error, reload } = useApi<Documento[]>("/academia/documentos");
  const [cat, setCat] = useState("todas");
  const docs = (data ?? []).filter((d) => cat === "todas" || d.categoria === cat);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 p-8 text-white sm:p-10">
        <GraduationCap className="h-10 w-10" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Academia de voluntariado</h1>
        <p className="mt-2 max-w-2xl text-white/80">
          Guías, plantillas y videos creados por INJUV y las organizaciones para que te prepares antes de tu voluntariado.
        </p>
      </div>
      <div className="mb-6">
        <Tabs
          value={cat}
          onChange={setCat}
          tabs={[
            { value: "todas", label: "Todo", count: data?.length },
            ...Object.entries(CATEGORIAS_ACADEMIA).map(([value, label]) => ({
              value,
              label,
              count: data?.filter((d) => d.categoria === value).length,
            })),
          ]}
        />
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && !docs.length && <EmptyState icon={GraduationCap} title="Aún no hay materiales en esta categoría" />}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((d) => (
          <DocumentoCard key={d.id} doc={d} />
        ))}
      </div>
    </div>
  );
}
