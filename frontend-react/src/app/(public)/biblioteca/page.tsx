"use client";

import { BookOpen, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";
import { DocumentoCard } from "@/components/ContentCards";
import { Stagger, StaggerItem } from "@/components/home/Stagger";
import Portada from "@/components/public/Portada";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import type { Documento, Tematica } from "@/lib/types";

export default function BibliotecaPage() {
  const tematicas = useApi<Tematica[]>("/biblioteca/tematicas");
  const [tematica, setTematica] = useState("");
  const [q, setQ] = useState("");
  const query = useDeferredValue(new URLSearchParams({ ...(tematica && { tematica_id: tematica }), ...(q && { q }) }).toString());
  const { data, loading, error, reload } = useApi<Documento[]>(`/biblioteca/documentos${query ? `?${query}` : ""}`);
  const activa = tematicas.data?.find((t) => String(t.id) === tematica);

  return (
    <>
      <Portada
        tono="ambar"
        compacta
        lineas={["Biblioteca", "y estudios"]}
        texto="Investigaciones, encuestas e informes del INJUV y sus aliados sobre juventud, participación y voluntariado. Descárgalos gratis."
        lado={
          data ? (
            <p className="text-right lg:text-left">
              <span className="block font-display text-6xl leading-none tabular-nums tracking-[-0.03em] text-tinta">{data.length}</span>
              <span className="mt-2 block text-sm text-tinta/70">{data.length === 1 ? "documento" : "documentos"}{activa ? ` en ${activa.nombre}` : " disponibles"}</span>
            </p>
          ) : undefined
        }
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <input aria-label="Buscar" placeholder="Buscar documento…" className="campo-vivo" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Portada>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pb-32 lg:pt-14">
        {/* Temáticas: fichas que filtran (mismo estado que antes alimentaba el selector) */}
        <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 [scrollbar-width:none]" role="group" aria-label="Temática">
          <div className="flex gap-2">
            <button type="button" className="ficha" aria-pressed={tematica === ""} onClick={() => setTematica("")}>
              Todas las temáticas
            </button>
            {(tematicas.data ?? []).map((t) => (
              <button key={t.id} type="button" className="ficha" aria-pressed={tematica === String(t.id)} onClick={() => setTematica(String(t.id))}>
                {t.nombre}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10">
          {error && <ErrorState message={error} onRetry={reload} />}
          {loading && !data && <Spinner />}
          {data?.length === 0 && <EmptyState icon={BookOpen} title="No hay documentos con esos filtros" description="Prueba con otra temática o con otra palabra." />}
          {!!data?.length && (
            <Stagger key={query} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
              {data.map((d) => (
                <StaggerItem key={d.id} className="h-full">
                  <DocumentoCard doc={d} />
                </StaggerItem>
              ))}
            </Stagger>
          )}
        </div>
      </div>
    </>
  );
}
