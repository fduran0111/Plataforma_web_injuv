"use client";

import { Search, SearchX, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Stagger, StaggerItem } from "@/components/home/Stagger";
import OportunidadCard, { OportunidadCardSkeleton } from "@/components/oportunidades/OportunidadCard";
import Portada from "@/components/public/Portada";
import { Button, EmptyState, ErrorState, Select } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useOportunidadesPostuladas } from "@/hooks/useMisPostulaciones";
import { AREAS_VOLUNTARIADO, REGIONES } from "@/lib/constants";
import type { Oportunidad } from "@/lib/types";
import foto from "../../../../public/fotos/voluntariado-1.jpg";

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
  const filtrosActivos = [
    region && { key: "region", label: region },
    area && { key: "area", label: area },
    q && { key: "q", label: `“${q}”` },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <>
      <Portada
        tono="foto"
        foto={foto}
        alt="Jóvenes voluntarios con chalecos INJUV reunidos en una jornada en terreno"
        lineas={["Encuentra tu", "voluntariado"]}
        texto="Busca por región y área, revisa los plazos y postula en minutos. Cada hora que entregues queda certificada en tu perfil."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            update("q", texto.trim());
          }}
          className="grid gap-2 md:grid-cols-[1.6fr_1fr_1fr_auto]"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input
              aria-label="Buscar"
              placeholder="Buscar por título o descripción…"
              className="campo-vivo"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
            />
          </div>
          <Select className="select-vivo" aria-label="Región" value={region} onChange={(e) => update("region", e.target.value)} options={REGIONES} placeholder="Todas las regiones" />
          <Select className="select-vivo" aria-label="Área" value={area} onChange={(e) => update("area", e.target.value)} options={AREAS_VOLUNTARIADO} placeholder="Todas las áreas" />
          <Button type="submit" size="lg" className="h-12">
            <Search className="h-4 w-4" /> Buscar
          </Button>
        </form>
      </Portada>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pb-32 lg:pt-20">
        {error && <ErrorState message={error} onRetry={reload} />}
        {!error && (
          <>
            <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
              <h2 className="font-display text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] leading-[1.05] tracking-[-0.025em] text-fg">
                {data ? (
                  <>
                    <span className="tabular-nums">{data.length}</span>{" "}
                    {data.length === 1 ? "voluntariado" : "voluntariados"}
                    {hasFilters ? " con estos filtros" : " abiertos"}
                  </>
                ) : (
                  "Buscando voluntariados…"
                )}
              </h2>
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2">
                  {filtrosActivos.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className="ficha"
                      aria-pressed="true"
                      aria-label={`Quitar filtro ${f.label}`}
                      onClick={() => update(f.key, "")}
                    >
                      {f.label}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => router.replace(pathname)}>
                    Limpiar todo
                  </Button>
                </div>
              )}
            </div>

            <Stagger key={query.toString()} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.05}>
              {loading && !data
                ? Array.from({ length: 6 }, (_, i) => (
                    <StaggerItem key={i}>
                      <OportunidadCardSkeleton />
                    </StaggerItem>
                  ))
                : data?.map((op) => (
                    <StaggerItem key={op.id} className="h-full">
                      <OportunidadCard op={op} postulado={postuladas.has(op.id)} />
                    </StaggerItem>
                  ))}
            </Stagger>
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
    </>
  );
}

export default function OportunidadesPage() {
  return (
    <Suspense>
      <OportunidadesContent />
    </Suspense>
  );
}
