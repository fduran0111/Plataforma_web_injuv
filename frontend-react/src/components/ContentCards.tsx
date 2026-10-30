import { Download, FileText, Newspaper, PlayCircle } from "lucide-react";
import Link from "next/link";
import { Avatar, Badge, Recorte, Stars } from "@/components/ui";
import { fileUrl } from "@/lib/api";
import { CATEGORIAS_ACADEMIA } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/format";
import type { Documento, Noticia, ResenaPublica } from "@/lib/types";

export function NoticiaCard({ n }: { n: Noticia }) {
  return (
    <Recorte id={`noticia-${n.id}`} className="group flex h-full">
      <Link href={`/noticias/${n.id}`} className="flex flex-1 flex-col overflow-hidden rounded-[inherit] focus-visible:outline-none">
        <div className="relative aspect-[16/9] overflow-hidden border-b-[1.5px] border-tinta bg-papel-strong">
          {n.imagen ? (
            // eslint-disable-next-line @next/next/no-img-element -- imagen servida por la API
            <img src={fileUrl.noticia(n.imagen)} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-tinta/30">
              <Newspaper className="h-12 w-12" />
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <p className="text-xs font-medium text-fg-muted tabular-nums">{formatDate(n.fecha_publicacion)}</p>
          <h3 className="titulo-vivo mt-2 line-clamp-2 text-h3 text-fg">{n.titulo}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-fg-muted">{n.resumen || n.contenido}</p>
        </div>
      </Link>
    </Recorte>
  );
}

export function DocumentoCard({ doc }: { doc: Documento }) {
  const isVideo = doc.archivo_mime?.startsWith("video/");
  const Icon = isVideo ? PlayCircle : FileText;
  const etiqueta = doc.seccion === "academia" ? CATEGORIAS_ACADEMIA[doc.categoria ?? ""] : doc.tematica_nombre;
  return (
    <Recorte id={`doc-${doc.seccion}-${doc.id}`} interactive={false} className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <div className={`rounded-md border-[1.5px] border-tinta p-2.5 ${isVideo ? "bg-violet-50 text-violet-700" : "bg-brand-soft text-brand-dark"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {etiqueta && <Badge tone={doc.seccion === "academia" ? "violet" : "blue"}>{etiqueta}</Badge>}
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
    <Recorte id={`resena-${r.postulacion_id}`} interactive={false} className="flex h-full flex-col p-6">
      <figure className="flex flex-1 flex-col">
        <Stars value={r.calificacion} />
        <blockquote className="mt-3 flex-1 font-display text-lg leading-snug text-fg [font-variation-settings:'wght'_480,'opsz'_18]">
          “{r.resena}”
        </blockquote>
        <figcaption className="mt-5 flex items-center gap-3 border-t-[1.5px] border-dashed border-tinta/25 pt-4">
          <Avatar name={r.usuario_nombre} src={r.usuario_tiene_foto ? fileUrl.foto(r.usuario_id) : null} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-fg">{r.usuario_nombre}</p>
            <p className="truncate text-xs text-fg-muted">
              {r.oportunidad_titulo} · {r.organizacion_nombre}
            </p>
          </div>
        </figcaption>
      </figure>
    </Recorte>
  );
}
