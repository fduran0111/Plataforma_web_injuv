"use client";

import { CalendarDays, HeartHandshake, MapPin, Pencil, Plus, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import OportunidadForm from "@/components/organizacion/OportunidadForm";
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, LinkButton, PageHeader, Spinner, Tabs } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Oportunidad } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

function Contenido() {
  const params = useSearchParams();
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Oportunidad[]>("/oportunidades/mias");
  const [form, setForm] = useState<{ open: boolean; op: Oportunidad | null }>({ open: params.get("nueva") === "1", op: null });
  const [deleting, setDeleting] = useState<Oportunidad | null>(null);
  const [closing, setClosing] = useState<Oportunidad | null>(null);
  const [tab, setTab] = useState<"abiertas" | "cerradas">("abiertas");
  const [busy, setBusy] = useState(false);

  const abiertas = (data ?? []).filter((op) => op.estado !== "cerrada");
  const cerradas = (data ?? []).filter((op) => op.estado === "cerrada");
  const lista = tab === "abiertas" ? abiertas : cerradas;

  async function cambiarEstado(op: Oportunidad, estado: string) {
    setBusy(true);
    try {
      await apiFetch(`/oportunidades/${op.id}/estado`, { method: "PATCH", body: { estado } });
      toast(estado === "cerrada" ? "Voluntariado cerrado" : "Voluntariado reabierto");
      setClosing(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function eliminar() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/oportunidades/${deleting.id}`, { method: "DELETE" });
      toast("Voluntariado eliminado");
      setDeleting(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <>
      <PageHeader
        title="Mis voluntariados"
        description="Crea, edita y gestiona las convocatorias de tu organización."
        actions={
          <Button onClick={() => setForm({ open: true, op: null })}>
            <Plus className="h-4 w-4" /> Publicar voluntariado
          </Button>
        }
      />
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "abiertas", label: "Abiertas", count: abiertas.length },
            { value: "cerradas", label: "Cerradas", count: cerradas.length },
          ]}
        />
      </div>
      {!lista.length ? (
        <EmptyState
          icon={HeartHandshake}
          title={tab === "abiertas" ? "No tienes voluntariados abiertos" : "No hay voluntariados cerrados"}
          description={tab === "abiertas" ? "Publica tu primera convocatoria para recibir postulantes." : undefined}
          action={
            tab === "abiertas" && (
              <Button onClick={() => setForm({ open: true, op: null })}>
                <Plus className="h-4 w-4" /> Publicar voluntariado
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {lista.map((op) => (
            <Card key={op.id} className="p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/organizacion/oportunidades/${op.id}`} className="font-semibold text-fg hover:text-brand">
                      {op.titulo}
                    </Link>
                    <Badge tone={op.estado === "cerrada" ? "slate" : "green"}>{op.estado === "cerrada" ? "Cerrada" : "Abierta"}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-muted">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" /> {op.num_postulaciones} postulantes{op.cupo_maximo ? ` · ${op.cupo_maximo} cupos` : ""}
                    </span>
                    {op.fecha_limite_postulacion && (
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" /> Postulan hasta {formatDate(op.fecha_limite_postulacion)}
                      </span>
                    )}
                    {[op.comuna, op.region].filter(Boolean).length > 0 && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {[op.comuna, op.region].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href={`/organizacion/oportunidades/${op.id}`} variant="secondary" size="sm">
                    <Users className="h-4 w-4" /> Postulantes
                  </LinkButton>
                  <Button size="sm" variant="outline" onClick={() => setForm({ open: true, op })}>
                    <Pencil className="h-4 w-4" /> Editar
                  </Button>
                  {op.estado !== "cerrada" ? (
                    <Button size="sm" variant="outline" onClick={() => setClosing(op)}>
                      Cerrar
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => cambiarEstado(op, "activa")} loading={busy}>
                      Reabrir
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleting(op)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <OportunidadForm open={form.open} oportunidad={form.op} onClose={() => setForm({ open: false, op: null })} onSaved={() => reload()} />
      <ConfirmModal
        open={!!closing}
        onClose={() => setClosing(null)}
        onConfirm={() => closing && cambiarEstado(closing, "cerrada")}
        loading={busy}
        title="Cerrar voluntariado"
        confirmLabel="Cerrar convocatoria"
        message={
          <>
            Al cerrar <strong>{closing?.titulo}</strong> dejará de recibir postulaciones y se notificará por correo a los postulantes pendientes.
          </>
        }
      />
      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={eliminar}
        loading={busy}
        danger
        title="Eliminar voluntariado"
        confirmLabel="Eliminar"
        message={
          <>
            Vas a eliminar <strong>{deleting?.titulo}</strong> junto con todas sus postulaciones ({deleting?.num_postulaciones}). Esta acción no se puede
            deshacer.
          </>
        }
      />
    </>
  );
}

export default function OportunidadesOrgPage() {
  return (
    <Suspense>
      <Contenido />
    </Suspense>
  );
}
