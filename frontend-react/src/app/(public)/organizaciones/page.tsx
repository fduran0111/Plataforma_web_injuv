"use client";

import { ArrowUpRight, Building2, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Stagger, StaggerItem } from "@/components/home/Stagger";
import Portada from "@/components/public/Portada";
import { Avatar, EmptyState, ErrorState, Select, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { fileUrl } from "@/lib/api";
import { REGIONES } from "@/lib/constants";
import type { Organizacion } from "@/lib/types";

function FilaOrganizacion({ o }: { o: Organizacion }) {
  const n = o.num_oportunidades ?? 0;
  return (
    <Link
      href={`/organizaciones/${o.id}`}
      className="fila-org group grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-3 rounded-2xl bg-surface px-4 py-5 text-fg sm:px-6 lg:grid-cols-[auto_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] lg:gap-x-8"
    >
      <Avatar name={o.nombre} src={o.tiene_logo ? fileUrl.logo(o.id, o.logo_version) : null} size={56} className="ring-0" />
      <div className="min-w-0">
        <h3 className="titulo-vivo fila-org-texto truncate text-h3 text-fg">{o.nombre}</h3>
        <p className="fila-org-suave mt-0.5 truncate text-sm text-fg-muted">
          {[o.area_trabajo, o.region].filter(Boolean).join(" · ") || "Sin área definida"}
        </p>
      </div>
      <p className="fila-org-suave col-span-3 line-clamp-2 text-sm leading-relaxed text-fg-muted lg:col-span-1">
        {o.descripcion_breve || o.descripcion || "Sin descripción."}
      </p>
      <p className="fila-org-texto hidden text-right lg:block">
        <span className="block font-display text-3xl leading-none tabular-nums tracking-[-0.02em]">{n}</span>
        <span className="fila-org-suave mt-1 block text-xs text-fg-muted">{n === 1 ? "voluntariado" : "voluntariados"}</span>
      </p>
      <span aria-hidden className="fila-org-flecha col-start-3 row-start-1 flex h-10 w-10 items-center justify-center rounded-full border-[1.5px] [border-color:color-mix(in_srgb,currentColor_25%,transparent)] lg:col-start-5">
        <ArrowUpRight className="h-4 w-4" />
      </span>
    </Link>
  );
}

export default function OrganizacionesPage() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const query = useDeferredValue(new URLSearchParams({ ...(q && { q }), ...(region && { region }) }).toString());
  const { data, loading, error, reload } = useApi<Organizacion[]>(`/organizaciones${query ? `?${query}` : ""}`);

  return (
    <>
      <Portada
        tono="tinta"
        lineas={["Las organizaciones", "detrás de cada causa"]}
        texto="Fundaciones, corporaciones y colectivos de todo Chile que abren sus puertas al voluntariado joven. Conócelas y revisa qué están convocando."
      >
        <div className="grid gap-2 md:grid-cols-[1.8fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
            <input aria-label="Buscar" placeholder="Buscar por nombre o área…" className="campo-vivo" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select className="select-vivo" aria-label="Región" value={region} onChange={(e) => setRegion(e.target.value)} options={REGIONES} placeholder="Todas las regiones" />
        </div>
      </Portada>

      <div className="mx-auto max-w-7xl px-4 pb-24 pt-14 sm:px-6 lg:px-8 lg:pb-32 lg:pt-20">
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && !data && <Spinner />}
        {data && (
          <h2 className="mb-8 font-display text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] leading-[1.05] tracking-[-0.025em] text-fg">
            <span className="tabular-nums">{data.length}</span> {data.length === 1 ? "organización" : "organizaciones"}
            {region ? ` en ${region}` : " en todo Chile"}
          </h2>
        )}
        {data?.length === 0 && <EmptyState icon={Building2} title="No encontramos organizaciones" description="Prueba con otro nombre o región." />}
        {!!data?.length && (
          <Stagger key={query} className="grid gap-2" stagger={0.05}>
            {data.map((o) => (
              <StaggerItem key={o.id}>
                <FilaOrganizacion o={o} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </>
  );
}
