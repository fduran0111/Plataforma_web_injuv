"use client";

import { Newspaper } from "lucide-react";
import { NoticiaCard } from "@/components/ContentCards";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import type { Noticia } from "@/lib/types";

export default function NoticiasPage() {
  const { data, loading, error, reload } = useApi<Noticia[]>("/noticias");

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-fg">Noticias</h1>
      <p className="mb-8 mt-2 text-fg-muted">Novedades del voluntariado juvenil en Chile.</p>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={Newspaper} title="Aún no hay noticias publicadas" />}
      {!!data?.length && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((n) => (
            <NoticiaCard key={n.id} n={n} />
          ))}
        </div>
      )}
    </div>
  );
}
