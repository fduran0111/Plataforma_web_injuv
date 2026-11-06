"use client";

import { GraduationCap } from "lucide-react";
import { useState } from "react";
import { DocumentoCard } from "@/components/ContentCards";
import { Stagger, StaggerItem } from "@/components/home/Stagger";
import Portada from "@/components/public/Portada";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { CATEGORIAS_ACADEMIA } from "@/lib/constants";
import type { Documento } from "@/lib/types";

export default function AcademiaPage() {
  const { data, loading, error, reload } = useApi<Documento[]>("/academia/documentos");
  const [cat, setCat] = useState("todas");
  const docs = (data ?? []).filter((d) => cat === "todas" || d.categoria === cat);
  const categorias = [["todas", "Todo"], ...Object.entries(CATEGORIAS_ACADEMIA)] as [string, string][];

  return (
    <>
      <Portada
        tono="azul"
        compacta
        lineas={["Academia de", "voluntariado"]}
        texto="Guías, plantillas y videos creados por INJUV y las organizaciones para que llegues preparado a tu primer día de voluntariado."
        lado={
          data ? (
            <p className="text-right lg:text-left">
              <span className="block font-display text-6xl leading-none tabular-nums tracking-[-0.03em] text-ambar">{data.length}</span>
              <span className="mt-2 block text-sm text-white/75">{data.length === 1 ? "material disponible" : "materiales disponibles"}</span>
            </p>
          ) : undefined
        }
      >
        <div className="flex flex-wrap gap-1" role="group" aria-label="Categoría">
          {categorias.map(([value, label]) => {
            const n = value === "todas" ? data?.length : data?.filter((d) => d.categoria === value).length;
            return (
              <button key={value} type="button" className="ficha h-11 flex-1 justify-center border-0" aria-pressed={cat === value} onClick={() => setCat(value)}>
                {label}
                {n !== undefined && <span className="tabular-nums opacity-60">{n}</span>}
              </button>
            );
          })}
        </div>
      </Portada>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pb-32 lg:pt-20">
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && !data && <Spinner />}
        {data && !docs.length && <EmptyState icon={GraduationCap} title="Aún no hay materiales en esta categoría" />}
        {!!docs.length && (
          <Stagger key={cat} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
            {docs.map((d) => (
              <StaggerItem key={d.id} className="h-full">
                <DocumentoCard doc={d} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}
