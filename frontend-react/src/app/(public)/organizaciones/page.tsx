"use client";

import { Building2, MapPin, Search } from "lucide-react";
import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Avatar, Badge, EmptyState, ErrorState, Input, Select, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { fileUrl } from "@/lib/api";
import { REGIONES } from "@/lib/constants";
import type { Organizacion } from "@/lib/types";

export default function OrganizacionesPage() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("");
  const query = useDeferredValue(new URLSearchParams({ ...(q && { q }), ...(region && { region }) }).toString());
  const { data, loading, error, reload } = useApi<Organizacion[]>(`/organizaciones${query ? `?${query}` : ""}`);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-fg">Organizaciones</h1>
      <p className="mb-8 mt-2 text-fg-muted">Conoce a las organizaciones que impulsan el voluntariado en Chile.</p>

      <div className="mb-8 grid gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm sm:grid-cols-[2fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <Input aria-label="Buscar" placeholder="Buscar por nombre o área…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select aria-label="Región" value={region} onChange={(e) => setRegion(e.target.value)} options={REGIONES} placeholder="Todas las regiones" />
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={Building2} title="No encontramos organizaciones" />}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data?.map((o) => (
          <Link
            key={o.id}
            href={`/organizaciones/${o.id}`}
            className="group flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="flex items-center gap-4">
              <Avatar name={o.nombre} src={o.tiene_logo ? fileUrl.logo(o.id, o.logo_version) : null} size={56} />
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-fg group-hover:text-brand">{o.nombre}</h3>
                {o.area_trabajo && <p className="truncate text-sm text-fg-muted">{o.area_trabajo}</p>}
              </div>
            </div>
            <p className="mt-4 line-clamp-3 flex-1 text-sm text-fg-muted">{o.descripcion_breve || o.descripcion || "Sin descripción."}</p>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4 text-xs text-fg-muted">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {o.region || "Sin región"}
              </span>
              <Badge tone="blue">{o.num_oportunidades ?? 0} voluntariados</Badge>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
