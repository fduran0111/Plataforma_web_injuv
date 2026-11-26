import { ArrowUpRight, Download, FileText, Newspaper, PlayCircle } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge, Recorte, Stars } from "@/components/ui";
import { fileUrl } from "@/lib/api";
import { CATEGORIAS_ACADEMIA } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/format";
import type { Documento, Noticia, ResenaPublica } from "@/lib/types";

export function NoticiaCard({ n }: { n: Noticia }) {
  return (
    <div
      id={`noticia-${n.id}`}
      className="group tarjeta-crece relative flex h-full flex-col overflow-clip rounded-2xl bg-surface ring-1 ring-tinta/10 focus-within:ring-2 focus-within:ring-brand"
    >
      <Link href={`/noticias/${n.id}`} className="flex flex-1 flex-col focus-visible:outline-none">
        <div className="persiana relative aspect-[4/3] overflow-clip bg-papel-strong">
          {/* El zoom de entrada (scroll) y el del hover van en capas distintas para no pisarse */}
          <div className="persiana-zoom absolute inset-0">
            {n.imagen ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- relleno ambiental de la misma foto */}
                <img aria-hidden src={fileUrl.noticia(n.imagen)} alt="" className="noticia-imagen absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl saturate-150" />
                {/* eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API */}
                <img src={fileUrl.noticia(n.imagen)} alt="" className="noticia-imagen relative h-full w-full object-contain" />
              </>
            ) : (
              <div className="noticia-imagen relative h-full bg-brand-soft">
                <Newspaper aria-hidden strokeWidth={1.25} className="pointer-events-none absolute -bottom-6 -right-4 h-32 w-32 -rotate-12 text-brand/15" />
                <p className="absolute bottom-4 left-4 font-display text-xl leading-none tracking-[-0.02em] text-brand-dark">Noticia</p>
              </div>
            )}
          </div>
          <span className="absolute left-3 top-3 rounded-full bg-papel/95 px-2.5 py-1 text-xs font-semibold text-tinta tabular-nums shadow-sm">
            {formatDate(n.fecha_publicacion)}
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="line-clamp-2 text-h3 text-fg [overflow-wrap:anywhere] [text-wrap:balance] transition-colors duration-200 group-hover:text-brand">{n.titulo}</h3>
          <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-fg-secondary [overflow-wrap:anywhere]">{n.resumen || n.contenido}</p>
          <span className="mt-5 flex items-center justify-between border-t border-tinta/10 pt-4 text-sm font-semibold text-tinta">
            Leer noticia
            <span
              aria-hidden
              className="flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-tinta/15 transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-45 group-hover:border-brand group-hover:bg-brand group-hover:text-white"
            >
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </span>
        </div>
      </Link>
    </div>
  );
}

export function NoticiaCardSkeleton() {
  return (
    <div className="animate-pulse overflow-clip rounded-2xl bg-surface ring-1 ring-tinta/10">
      <div className="aspect-[4/3] bg-papel-strong" />
      <div className="p-5">
        <div className="h-5 w-4/5 rounded-sm bg-papel-strong" />
        <div className="mt-3 h-4 w-full rounded-sm bg-papel-strong" />
        <div className="mt-2 h-4 w-2/3 rounded-sm bg-papel-strong" />
        <div className="mt-6 h-8 w-1/2 rounded-sm bg-papel-strong" />
      </div>
    </div>
  );
}

export function DocumentoCard({ doc }: { doc: Documento }) {
  const isVideo = doc.archivo_mime?.startsWith("video/");
  const Icon = isVideo ? PlayCircle : FileText;
  const etiqueta = doc.seccion === "academia" ? CATEGORIAS_ACADEMIA[doc.categoria ?? ""] : doc.tematica_nombre;
  return (
    <Recorte id={`doc-${doc.seccion}-${doc.id}`} interactive={false} className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className={`rounded-md border-[1.5px] border-tinta p-2.5 ${isVideo ? "bg-ambar/25 text-[#8a5a0b]" : "bg-brand-soft text-brand-dark"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {etiqueta && <Badge tone={doc.seccion === "academia" ? "amber" : "blue"}>{etiqueta}</Badge>}
          <h3 className="mt-2 line-clamp-2 text-h3 text-fg">{doc.nombre_archivo}</h3>
        </div>
      </div>
      {doc.descripcion && <p className="mt-3 line-clamp-3 flex-1 text-sm leading-relaxed text-fg-muted">{doc.descripcion}</p>}
      <div className="mt-4 flex items-center justify-between gap-3 border-t-[1.5px] border-dashed border-tinta/25 pt-4">
        <p className="truncate text-xs text-fg-muted">
          {[doc.organizacion_nombre || doc.autor, formatDate(doc.fecha_edicion || doc.created_at, ""), formatBytes(doc.archivo_tamano_bytes)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <a
          href={fileUrl.documento(doc.seccion, doc.id)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border-[1.5px] border-tinta bg-tinta px-3 py-1.5 text-xs font-semibold text-papel transition-colors hover:bg-brand hover:border-brand"
        >
          <Download className="h-3.5 w-3.5" />
          Descargar
        </a>
      </div>
    </Recorte>
  );
}

export function ResenaCard({ r }: { r: ResenaPublica }) {
  return (
    <div id={`resena-${r.postulacion_id}`} className="flex h-full flex-col rounded-2xl bg-surface p-6 ring-1 ring-tinta/10">
      <figure className="flex flex-1 flex-col">
        <div className="flex items-center justify-between gap-3">
          <Stars value={r.calificacion} />
          <span aria-hidden className="font-display text-4xl leading-none text-ambar">
            “
          </span>
        </div>
        <blockquote className="mt-3 flex-1 font-display text-lg leading-snug text-fg [font-variation-settings:'wght'_480,'opsz'_18]">
          “{r.resena}”
        </blockquote>
        <figcaption className="mt-5 flex items-center gap-3 border-t border-tinta/15 pt-4">
          <Avatar name={r.usuario_nombre} src={r.usuario_tiene_foto ? fileUrl.foto(r.usuario_id) : null} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{r.usuario_nombre}</p>
            <p className="truncate text-xs text-fg-muted">
              Para{" "}
              <Link href={`/organizaciones/${r.organizacion_id}`} className="font-semibold text-brand hover:underline">
                {r.organizacion_nombre}
              </Link>
            </p>
            <p className="truncate text-xs text-fg-muted">{r.oportunidad_titulo}</p>
          </div>
        </figcaption>
      </figure>
    </div>
  );
}
