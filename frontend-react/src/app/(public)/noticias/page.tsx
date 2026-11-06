"use client";

import { ArrowUpRight, Newspaper } from "lucide-react";
import Link from "next/link";
import { NoticiaCard } from "@/components/ContentCards";
import { Stagger, StaggerItem } from "@/components/home/Stagger";
import Entrada from "@/components/public/Entrada";
import Portada from "@/components/public/Portada";
import { EmptyState, ErrorState, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Noticia } from "@/lib/types";

const fechaCorta = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short" });

function Destacada({ n }: { n: Noticia }) {
  const fecha = n.fecha_publicacion ? new Date(`${n.fecha_publicacion}T00:00:00`) : null;
  return (
    <Link
      href={`/noticias/${n.id}`}
      className="group grid overflow-clip rounded-2xl bg-surface ring-1 ring-tinta/10 transition-[box-shadow] duration-300 ease-[var(--ease-out)] hover:shadow-[0_32px_64px_-32px_rgb(15_27_45/0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar lg:grid-cols-12"
    >
      <div className="persiana-montaje relative aspect-[16/10] overflow-clip lg:col-span-7 lg:aspect-auto lg:min-h-[420px]">
        {n.imagen ? (
          // eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API
          <img
            src={fileUrl.noticia(n.imagen)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out)] group-hover:scale-[1.03]"
          />
        ) : (
          <div className="persiana-fondo flex h-full flex-col justify-between bg-ambar p-6 text-tinta lg:p-8">
            <Newspaper className="h-8 w-8" />
            {fecha && (
              <p className="font-display text-[clamp(4rem,3rem+6vw,9rem)] leading-[0.85] tracking-[-0.04em]">
                {fechaCorta.format(fecha).replace(".", "")}
              </p>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-col p-6 sm:p-8 lg:col-span-5 lg:p-10">
        <p className="text-sm font-semibold tabular-nums text-fg-muted">{formatDate(n.fecha_publicacion)}</p>
        <h2 className="mt-3 font-display text-[clamp(1.75rem,1.2rem+2vw,2.75rem)] leading-[1.05] tracking-[-0.025em] text-fg transition-colors duration-200 group-hover:text-brand [text-wrap:balance]">
          {n.titulo}
        </h2>
        <p className="mt-4 line-clamp-4 flex-1 text-base leading-relaxed text-fg-secondary">{n.resumen || n.contenido}</p>
        <p className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-fg">
          Leer la noticia
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-tinta/15 transition-[background-color,color,transform] duration-300 ease-[var(--ease-out)] group-hover:rotate-45 group-hover:border-brand group-hover:bg-brand group-hover:text-white">
            <ArrowUpRight className="h-4 w-4" />
          </span>
        </p>
      </div>
    </Link>
  );
}

export default function NoticiasPage() {
  const { data, loading, error, reload } = useApi<Noticia[]>("/noticias");
  const [primera, ...resto] = data ?? [];

  return (
    <>
      <Portada
        tono="tinta"
        compacta
        lineas={["Noticias del", "voluntariado"]}
        texto="Convocatorias, resultados y novedades del programa nacional de voluntariado juvenil."
        lado={
          data && data.length > 0 ? (
            <p className="text-right lg:text-left">
              <span className="block font-display text-6xl leading-none tabular-nums tracking-[-0.03em] text-ambar">{data.length}</span>
              <span className="mt-2 block text-sm text-papel/70">{data.length === 1 ? "noticia publicada" : "noticias publicadas"}</span>
            </p>
          ) : undefined
        }
      />

      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {error && <ErrorState message={error} onRetry={reload} />}
        {loading && !data && <Spinner />}
        {data?.length === 0 && <EmptyState icon={Newspaper} title="Aún no hay noticias publicadas" />}
        {primera && (
          <Entrada>
            <Destacada n={primera} />
          </Entrada>
        )}
        {!!resto.length && (
          <section className="mt-16 lg:mt-24">
            <h2 className="mb-8 font-display text-[clamp(1.75rem,1.2rem+1.8vw,2.75rem)] leading-[1.05] tracking-[-0.025em] text-fg">Más noticias</h2>
            <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
              {resto.map((n) => (
                <StaggerItem key={n.id} className="h-full">
                  <NoticiaCard n={n} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        )}
      </div>
    </>
  );
}
