"use client";

import { CheckCircle2, ExternalLink, Globe, Inbox, Mail, MapPin, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Spinner, Tabs, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { formatDate, formatRut } from "@/lib/format";
import type { Solicitud } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

const TONE = { pendiente: "amber" as const, aprobada: "green" as const, rechazada: "red" as const };

export default function AdminSolicitudesPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"pendiente" | "aprobadas" | "rechazadas">("pendiente");
  const { data, loading, error, reload } = useApi<Solicitud[]>(`/admin/solicitudes${tab !== "pendiente" ? `?estado=${tab === "aprobadas" ? "aprobada" : "rechazada"}` : ""}`);
  const pendientes = useApi<Solicitud[]>("/admin/solicitudes?estado=pendiente");
  const [review, setReview] = useState<{ s: Solicitud; estado: "aprobada" | "rechazada" } | null>(null);
  const [comentario, setComentario] = useState("");
  const [busy, setBusy] = useState(false);

  async function revisar() {
    if (!review) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/solicitudes/${review.s.id}`, { method: "PATCH", body: { estado: review.estado, comentario: comentario || null } });
      toast(review.estado === "aprobada" ? "Organización creada y usuario asignado" : "Solicitud rechazada");
      setReview(null);
      setComentario("");
      reload();
      pendientes.reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Solicitudes de organización" description="Revisa y aprueba las organizaciones que quieren publicar voluntariados." />
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "pendiente", label: "Pendientes", count: pendientes.data?.length },
            { value: "aprobadas", label: "Aprobadas" },
            { value: "rechazadas", label: "Rechazadas" },
          ]}
        />
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={Inbox} title={tab === "pendiente" ? "No hay solicitudes pendientes" : "No hay solicitudes aquí"} />}
      <div className="space-y-4">
        {data?.map((s) => (
          <Card key={s.id} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-fg">{s.nombre}</h3>
                  <Badge tone={TONE[s.estado]}>{s.estado}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                  {s.rut && <span>RUT {formatRut(s.rut)}</span>}
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {s.email_contacto}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {[s.comuna, s.ciudad, s.region].filter(Boolean).join(", ")}
                  </span>
                  <span>Fundada el {formatDate(s.fecha_creacion)}</span>
                  <span>Enviada el {formatDate(s.created_at)}</span>
                </div>
              </div>
            </div>
            <p className="prose-text mt-4 text-sm text-fg-secondary">{s.descripcion}</p>
            {(s.sitio_web || s.redes_sociales.length > 0) && (
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {s.sitio_web && (
                  <a href={s.sitio_web} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand hover:underline">
                    <Globe className="h-3.5 w-3.5" /> {s.sitio_web}
                  </a>
                )}
                {s.redes_sociales.map((r) => (
                  <a key={r} href={r.startsWith("http") ? r : `https://${r}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-brand hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" /> <span className="max-w-52 truncate">{r}</span>
                  </a>
                ))}
              </div>
            )}
            <p className="mt-4 border-t border-border pt-3 text-xs text-fg-muted">
              Solicitada por <strong>{s.usuario_nombre}</strong> ({s.usuario_email})
              {s.revisado_por && ` · revisada por ${s.revisado_por}`}
            </p>
            {s.comentario_revision && <p className="mt-2 rounded-lg bg-page p-3 text-sm text-fg-secondary">Comentario: {s.comentario_revision}</p>}
            {s.estado === "pendiente" && (
              <div className="mt-4 flex gap-2">
                <Button size="sm" onClick={() => setReview({ s, estado: "aprobada" })}>
                  <CheckCircle2 className="h-4 w-4" /> Aprobar
                </Button>
                <Button size="sm" variant="danger" onClick={() => setReview({ s, estado: "rechazada" })}>
                  <XCircle className="h-4 w-4" /> Rechazar
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal
        open={!!review}
        onClose={() => setReview(null)}
        title={review?.estado === "aprobada" ? `Aprobar ${review.s.nombre}` : `Rechazar ${review?.s.nombre}`}
        description={
          review?.estado === "aprobada"
            ? "Se creará la organización y el solicitante quedará como su administrador."
            : "El solicitante podrá ver el motivo en su perfil."
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setReview(null)}>
              Cancelar
            </Button>
            <Button variant={review?.estado === "rechazada" ? "danger" : "primary"} loading={busy} onClick={revisar}>
              {review?.estado === "aprobada" ? "Aprobar y crear" : "Rechazar solicitud"}
            </Button>
          </>
        }
      >
        <Textarea
          placeholder={review?.estado === "rechazada" ? "Motivo del rechazo (recomendado)…" : "Comentario (opcional)…"}
          value={comentario}
          onChange={(e) => setComentario(e.target.value)}
          maxLength={2000}
        />
      </Modal>
    </>
  );
}
