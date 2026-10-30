"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ErrorState, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Noticia } from "@/lib/types";

export default function NoticiaPage() {
  const { id } = useParams<{ id: string }>();
  const { data: n, loading, error, reload } = useApi<Noticia>(`/noticias/${id}`);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/noticias" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Todas las noticias
      </Link>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !n && <Spinner />}
      {n && (
        <>
          <p className="text-sm font-medium text-brand">{formatDate(n.fecha_publicacion)}</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-fg sm:text-4xl">{n.titulo}</h1>
          {n.resumen && <p className="mt-4 text-lg text-fg-muted">{n.resumen}</p>}
          <p className="mt-4 text-sm text-fg-muted">Por {n.autor_nombre}</p>
          {n.imagen && (
            // eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API
            <img src={fileUrl.noticia(n.imagen)} alt="" className="mt-8 w-full rounded-2xl object-cover shadow-sm" />
          )}
          <div className="prose-text mt-8 text-fg-secondary">{n.contenido}</div>
        </>
      )}
    </article>
  );
}
