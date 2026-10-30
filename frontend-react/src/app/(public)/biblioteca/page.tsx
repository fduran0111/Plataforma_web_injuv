"use client";

import { BookOpen, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { DocumentoCard } from "@/components/ContentCards";
import { EmptyState, ErrorState, Input, Select, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import type { Documento, Tematica } from "@/lib/types";

export default function BibliotecaPage() {
  const tematicas = useApi<Tematica[]>("/biblioteca/tematicas");
  const [tematica, setTematica] = useState("");
  const [q, setQ] = useState("");
  const query = useDeferredValue(new URLSearchParams({ ...(tematica && { tematica_id: tematica }), ...(q && { q }) }).toString());
  const { data, loading, error, reload } = useApi<Documento[]>(`/biblioteca/documentos${query ? `?${query}` : ""}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 rounded-3xl bg-gradient-to-br from-sky-600 to-brand p-8 text-white sm:p-10">
        <BookOpen className="h-10 w-10" />
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Biblioteca y estudios</h1>
        <p className="mt-2 max-w-2xl text-white/80">Investigaciones, informes y documentos sobre juventud, participación y voluntariado.</p>
      </div>
      <div className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[2fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <Input aria-label="Buscar" placeholder="Buscar documento…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select
          aria-label="Temática"
          value={tematica}
          onChange={(e) => setTematica(e.target.value)}
          options={(tematicas.data ?? []).map((t) => ({ value: t.id, label: t.nombre }))}
          placeholder="Todas las temáticas"
        />
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={BookOpen} title="No hay documentos con esos filtros" />}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((d) => (
          <DocumentoCard key={d.id} doc={d} />
        ))}
      </div>
    </div>
  );
}
