"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Entrada from "@/components/public/Entrada";
import { ErrorState, LinkButton, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Noticia } from "@/lib/types";

export default function NoticiaPage() {
  const { id } = useParams<{ id: string }>();
  const { data: n, loading, error, reload } = useApi<Noticia>(`/noticias/${id}`);

  return (
    <article className="py-10 lg:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <Link
        href="/noticias"
        className="group inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:-translate-x-1" /> Todas las noticias
      </Link>
      {error && (
        <div className="mt-8">
          <ErrorState message={error} onRetry={reload} />
        </div>
      )}
      {loading && !n && <Spinner className="py-24" />}
      </div>
      {n && (
        <>
          {/* Fondo ambiental a todo el ancho: la foto, desenfocada y velada en papel, tiñe el encabezado */}
          <div className="relative mt-10 overflow-clip lg:mt-14">
            {n.imagen && (
              <div aria-hidden className="absolute inset-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- misma imagen que el cuerpo */}
                <img src={fileUrl.noticia(n.imagen)} alt="" className="h-full w-full scale-125 object-cover opacity-30 blur-3xl saturate-150" />
                <div className="absolute inset-0 bg-gradient-to-b from-papel via-papel/55 to-papel" />
              </div>
            )}
            <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <Entrada as="header" className="grid gap-x-8 gap-y-6 pt-8 lg:grid-cols-12 lg:pt-10">
                <h1 className="font-display text-[clamp(2.25rem,1.2rem+3.8vw,5rem)] leading-[0.98] tracking-[-0.03em] text-fg [text-wrap:balance] lg:col-span-9">
                  {n.titulo}
                </h1>
                <div className="flex flex-wrap items-end gap-x-6 gap-y-2 lg:col-span-9">
                  <p className="inline-flex items-center gap-3 text-base font-semibold text-fg">
                    <span className="h-[3px] w-6 rounded-full bg-ambar" aria-hidden />
                    {formatDate(n.fecha_publicacion)}
                  </p>
                  <p className="text-base text-fg-muted">Por {n.autor_nombre}</p>
                </div>
              </Entrada>

              {n.imagen && (
                <Entrada retraso={0.15} className="mt-10 pb-10 lg:mt-14 lg:pb-14">
                  <div className="persiana-montaje relative overflow-clip rounded-2xl bg-papel-strong ring-1 ring-tinta/10">
                    {/* eslint-disable-next-line @next/next/no-img-element -- relleno ambiental de la misma foto */}
                    <img aria-hidden src={fileUrl.noticia(n.imagen)} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl saturate-150" />
                    {/* eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API */}
                    <img src={fileUrl.noticia(n.imagen)} alt="" className="relative mx-auto max-h-[34rem] w-full object-contain" />
                  </div>
                </Entrada>
              )}
            </div>
          </div>

          <Entrada retraso={0.25} className="mx-auto mt-12 grid max-w-7xl gap-x-8 px-4 sm:px-6 lg:mt-16 lg:grid-cols-12 lg:px-8">
            <div className="lg:col-span-7 lg:col-start-3">
              {n.resumen && <p className="font-display text-[clamp(1.25rem,1.05rem+0.8vw,1.625rem)] leading-[1.35] text-fg [font-variation-settings:'wght'_520,'opsz'_24]">{n.resumen}</p>}
              <div className="prose-text mt-8 text-lg leading-[1.75] text-fg-secondary">{n.contenido}</div>
              <div className="mt-14 border-t-[1.5px] border-tinta/15 pt-8">
                <LinkButton href="/noticias" variant="outline">
                  <ArrowLeft className="h-4 w-4" /> Volver a las noticias
                </LinkButton>
              </div>
            </div>
          </Entrada>
        </>
      )}
    </article>
  );
}
