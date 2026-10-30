"use client";

import { Search, SearchX, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import OportunidadCard, { OportunidadCardSkeleton } from "@/components/oportunidades/OportunidadCard";
import { Button, EmptyState, ErrorState, Input, Select } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useOportunidadesPostuladas } from "@/hooks/useMisPostulaciones";
import { AREAS_VOLUNTARIADO, REGIONES } from "@/lib/constants";
import type { Oportunidad } from "@/lib/types";

function OportunidadesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const region = params.get("region") ?? "";
  const area = params.get("area") ?? "";
  const q = params.get("q") ?? "";
  const [texto, setTexto] = useState(q);
  const [prevQ, setPrevQ] = useState(q);
  if (prevQ !== q) {
    setPrevQ(q);
    setTexto(q);
  }

  const query = new URLSearchParams();
  if (region) query.set("region", region);
  if (area) query.set("area", area);
  if (q) query.set("q", q);
  const { data, loading, error, reload } = useApi<Oportunidad[]>(`/oportunidades${query.size ? `?${query}` : ""}`);
  const postuladas = useOportunidadesPostuladas();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  const hasFilters = !!(region || area || q);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-fg">Oportunidades de voluntariado</h1>
        <p className="mt-2 text-fg-muted">Encuentra el voluntariado ideal según tu región e intereses.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_auto]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update("q", texto.trim());
            }}
            className="relative"
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <Input aria-label="Buscar" placeholder="Buscar por título o descripción…" className="pl-10" value={texto} onChange={(e) => setTexto(e.target.value)} />
          </form>
          <Select aria-label="Región" value={region} onChange={(e) => update("region", e.target.value)} options={REGIONES} placeholder="Todas las regiones" />
          <Select aria-label="Área" value={area} onChange={(e) => update("area", e.target.value)} options={AREAS_VOLUNTARIADO} placeholder="Todas las áreas" />
          <Button variant="ghost" disabled={!hasFilters} onClick={() => router.replace(pathname)}>
            <SlidersHorizontal className="h-4 w-4" /> Limpiar
          </Button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {!error && (
        <>
          {data && (
            <p className="mb-4 text-sm text-fg-muted">
              {data.length} {data.length === 1 ? "voluntariado encontrado" : "voluntariados encontrados"}
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {loading && !data
              ? Array.from({ length: 6 }, (_, i) => <OportunidadCardSkeleton key={i} />)
              : data?.map((op) => <OportunidadCard key={op.id} op={op} postulado={postuladas.has(op.id)} />)}
          </div>
          {data?.length === 0 && (
            <EmptyState
              icon={SearchX}
              title="No encontramos voluntariados"
              description={hasFilters ? "Prueba con otros filtros o con otra región." : "Por ahora no hay voluntariados abiertos."}
              action={hasFilters && <Button variant="outline" onClick={() => router.replace(pathname)}>Ver todos</Button>}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function OportunidadesPage() {
  return (
    <Suspense>
      <OportunidadesContent />
    </Suspense>
  );
}
