import { Download, FileText, Newspaper, PlayCircle } from "lucide-react";
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
      className="group relative flex h-full flex-col overflow-clip rounded-2xl bg-surface ring-1 ring-tinta/10 transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:ring-2 focus-within:ring-brand hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-24px_rgb(15_27_45/0.35)]"
    >
      <Link href={`/noticias/${n.id}`} className="flex flex-1 flex-col focus-visible:outline-none">
        <div className="persiana relative aspect-[16/9] overflow-clip bg-papel-strong">
          {n.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API
            <img
              src={fileUrl.noticia(n.imagen)}
              alt=""
              className="persiana-zoom h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
            />
          ) : (
            <div className="persiana-zoom flex h-full items-center justify-center text-tinta/30">
              <Newspaper className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="inline-flex w-fit items-center rounded-full bg-papel px-2.5 py-1 text-xs font-medium text-fg-muted tabular-nums">
            {formatDate(n.fecha_publicacion)}
          </p>
          <h3 className="mt-2 line-clamp-2 text-h3 text-fg transition-colors duration-200 group-hover:text-brand">{n.titulo}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fg-muted">{n.resumen || n.contenido}</p>
        </div>
      </Link>
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
              {r.oportunidad_titulo} · {r.organizacion_nombre}
            </p>
          </div>
        </figcaption>
      </figure>
    </div>
  );
}
