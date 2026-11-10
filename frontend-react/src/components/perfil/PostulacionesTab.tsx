"use client";

import { Award, CalendarDays, ClipboardList, Download, Eye, EyeOff, Handshake, MessageSquareQuote, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Alert, Badge, Button, Card, Checkbox, ConfirmModal, EmptyState, ErrorState, LinkButton, Modal, Spinner, Stars, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, downloadFile } from "@/lib/api";
import { ESTADO_POSTULACION_TONE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import type { Asistencia, PostulacionUsuario, Usuario } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
      <div className="mt-1 text-sm text-fg-secondary">{children}</div>
    </div>
  );
}

function AsistenciaText({ label, value }: { label: string; value: Asistencia }) {
  return (
    <InfoRow label={label}>
      {value === "No aplica" ? "—" : value === "SI" ? <Badge tone="green">Asistió</Badge> : <Badge tone="red">No asistió</Badge>}
    </InfoRow>
  );
}

export default function PostulacionesTab({ user }: { user: Usuario }) {
  const toast = useToast();
  const { data, loading, error, reload, setData } = useApi<PostulacionUsuario[]>("/usuarios/me/postulaciones");
  const [declining, setDeclining] = useState<PostulacionUsuario | null>(null);
  const [reviewing, setReviewing] = useState<PostulacionUsuario | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (p: PostulacionUsuario) => setData((prev) => (prev ?? []).map((x) => (x.id === p.id ? { ...x, ...p } : x)));

  async function run(action: () => Promise<PostulacionUsuario>, okMessage?: string) {
    setBusy(true);
    try {
      const updated = await action();
      update(updated);
      if (okMessage) toast(okMessage);
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data?.length)
    return (
      <EmptyState
        icon={ClipboardList}
        title="Aún no has postulado"
        description="Explora los voluntariados abiertos y súmate a una causa."
        action={<LinkButton href="/oportunidades">Ver oportunidades</LinkButton>}
      />
    );

  return (
    <div className="space-y-4">
      {data.map((p) => {
        const seleccionado = p.estado === "Seleccionado";
        const finalizada = p.estado === "No seleccionado" || p.estado === "Declinada por usuario";
        const motivo = p.motivo_no_seleccion_otro || p.motivo_no_seleccion;
        return (
          <Card key={p.id} className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Link href={`/oportunidades/${p.oportunidad_id}`} className="font-semibold text-fg hover:text-brand">
                  {p.oportunidad_titulo}
                </Link>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {p.organizacion_nombre} · postulaste el {formatDate(p.created_at)}
                </p>
              </div>
              <Badge tone={ESTADO_POSTULACION_TONE[p.estado] ?? "neutral"}>{p.estado}</Badge>
            </div>

            {p.estado === "No seleccionado" && motivo && (
              <Alert tone="amber" className="mt-4">
                Motivo informado por la organización: {motivo}
              </Alert>
            )}

            {seleccionado && (
              <Alert tone="green" className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span>
                  ¡Fuiste seleccionado/a!{" "}
                  {p.estado_confirmacion === "Confirmado"
                    ? "Confirmaste tu participación."
                    : p.estado_confirmacion === "No confirmado"
                      ? "Indicaste que no participarás."
                      : "Confirma tu participación para la organización."}
                </span>
                {p.estado_confirmacion !== "Confirmado" && p.estado_confirmacion !== "No confirmado" && (
                  <span className="flex gap-2">
                    <Button
                      size="sm"
                      loading={busy}
                      onClick={() => run(() => apiFetch(`/postulaciones/${p.id}/confirmacion`, { method: "PUT", body: { estado_confirmacion: "Confirmado" } }), "¡Participación confirmada!")}
                    >
                      Confirmar participación
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={busy}
                      onClick={() => run(() => apiFetch(`/postulaciones/${p.id}/confirmacion`, { method: "PUT", body: { estado_confirmacion: "No confirmado" } }))}
                    >
                      No puedo participar
                    </Button>
                  </span>
                )}
              </Alert>
            )}

            <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
              <AsistenciaText label="Capacitación" value={p.asistencia_capacitacion} />
              <AsistenciaText label="Actividad" value={p.asistencia_actividad} />
              <InfoRow label="Horas registradas">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-fg-muted" /> {p.horas_voluntariado} h
                </span>
              </InfoRow>
            </div>

            {(p.resena_org || p.calificacion_org != null) && p.resena_org_publica && (
              <div className="mt-5 rounded-xl bg-page p-4">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                  <MessageSquareQuote className="h-3.5 w-3.5" /> La organización sobre ti
                </p>
                {p.calificacion_org != null && (
                  <div className="mt-2">
                    <Stars value={p.calificacion_org} />
                  </div>
                )}
                {p.resena_org && <p className="mt-2 text-sm text-fg-secondary">{p.resena_org}</p>}
              </div>
            )}

            {p.resena_usuario && (
              <div className="mt-4 rounded-xl border border-border p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Tu reseña</p>
                  <span className="flex items-center gap-1 text-xs text-fg-muted">
                    {p.resena_usuario_publica ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {p.resena_usuario_publica ? "Pública" : "Solo la organización"}
                  </span>
                </div>
                <div className="mt-2">
                  <Stars value={p.calificacion_usuario} />
                </div>
                <p className="mt-2 text-sm text-fg-secondary">{p.resena_usuario}</p>
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-2">
              {seleccionado && p.tiene_certificado && (
                <Button size="sm" variant="secondary" onClick={() => downloadFile(`/postulaciones/${p.id}/certificado`, "certificado_voluntariado.pdf")}>
                  <Download className="h-4 w-4" /> Descargar certificado
                </Button>
              )}
              {seleccionado && !p.rechazo_participacion && !p.tiene_certificado && (
                <Badge tone="neutral">
                  <Award className="h-3.5 w-3.5" /> Certificado pendiente
                </Badge>
              )}
              {p.puede_certificar_y_evaluar ? (
                <Button size="sm" variant="outline" onClick={() => setReviewing(p)}>
                  <MessageSquareQuote className="h-4 w-4" /> {p.resena_usuario ? "Editar reseña" : "Dejar reseña"}
                </Button>
              ) : (
                seleccionado &&
                !p.rechazo_participacion && (
                  <span className="self-center text-xs text-fg-muted">Podrás evaluar el voluntariado cuando termine.</span>
                )
              )}
              {!finalizada && !seleccionado && (
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeclining(p)}>
                  <X className="h-4 w-4" /> Retirar postulación
                </Button>
              )}
            </div>
          </Card>
        );
      })}

      <ConfirmModal
        open={!!declining}
        onClose={() => setDeclining(null)}
        onConfirm={async () => {
          if (!declining) return;
          const ok = await run(() => apiFetch(`/postulaciones/${declining.id}/declinar`, { method: "PUT" }), "Postulación retirada");
          if (ok) setDeclining(null);
        }}
        loading={busy}
        danger
        title="Retirar postulación"
        confirmLabel="Retirar"
        message={
          <>
            Vas a retirar tu postulación a <strong>{declining?.oportunidad_titulo}</strong>. La organización dejará de considerarte para este voluntariado.
          </>
        }
      />

      <ResenaModal
        key={reviewing?.id ?? "cerrado"}
        postulacion={reviewing}
        busy={busy}
        onClose={() => setReviewing(null)}
        onSave={async (resena, calificacion, esPublica) => {
          if (!reviewing) return;
          const ok = await run(
            () => apiFetch(`/postulaciones/${reviewing.id}/resena-usuario`, { method: "PUT", body: { resena, calificacion, es_publica: esPublica } }),
            "¡Gracias por tu reseña!",
          );
          if (ok) setReviewing(null);
        }}
      />
      {user.organizacion && (
        <Alert tone="blue" className="flex items-center gap-2">
          <Handshake className="h-4 w-4" /> También administras una organización —{" "}
          <Link href="/organizacion" className="font-semibold underline">
            ir al panel de organización
          </Link>
        </Alert>
      )}
    </div>
  );
}

function ResenaModal({
  postulacion,
  busy,
  onClose,
  onSave,
}: {
  postulacion: PostulacionUsuario | null;
  busy: boolean;
  onClose: () => void;
  onSave: (resena: string, calificacion: number, esPublica: boolean) => void;
}) {
  const [resena, setResena] = useState(postulacion?.resena_usuario ?? "");
  const [calificacion, setCalificacion] = useState<number | null>(postulacion?.calificacion_usuario ?? null);
  const [esPublica, setEsPublica] = useState(postulacion?.resena_usuario_publica ?? true);

  return (
    <Modal
      open={!!postulacion}
      onClose={onClose}
      title="Reseña sobre la organización"
      description={postulacion?.oportunidad_titulo}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={busy} disabled={resena.trim().length < 3 || !calificacion} onClick={() => onSave(resena.trim(), calificacion!, esPublica)}>
            Guardar reseña
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium text-fg-secondary">Calificación</p>
          <Stars value={calificacion} size={26} onChange={setCalificacion} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-fg-secondary">¿Cómo fue tu experiencia?</p>
          <Textarea
            value={resena}
            onChange={(e) => setResena(e.target.value)}
            maxLength={2000}
            placeholder="Cuenta brevemente cómo te fue en este voluntariado…"
          />
        </div>
        <Checkbox label="Mostrar mi reseña públicamente en el perfil de la organización" checked={esPublica} onChange={(e) => setEsPublica(e.target.checked)} />
      </div>
    </Modal>
  );
}
