"use client";

import { FileText, MapPin, Search, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Input, PageHeader, Select, Spinner } from "@/components/ui";
import FilasAnimadas from "@/components/admin/FilasAnimadas";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Oportunidad } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

export default function AdminOportunidadesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Oportunidad[]>("/oportunidades?estado=todas&limit=500");
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [deleting, setDeleting] = useState<Oportunidad | null>(null);
  const [busy, setBusy] = useState(false);

  const lista = (data ?? []).filter(
    (op) =>
      (!estado || op.estado === estado) &&
      (!q.trim() || `${op.titulo} ${op.organizacion_nombre}`.toLowerCase().includes(q.trim().toLowerCase())),
  );

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

  return (
    <>
      <PageHeader title="Voluntariados" description="Todos los voluntariados publicados en la plataforma." />
      <div className="mb-6 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <Input placeholder="Buscar por título u organización…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={estado} onChange={(e) => setEstado(e.target.value)} options={["activa", "abierta", "cerrada"]} placeholder="Todos los estados" />
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && !lista.length && <EmptyState icon={FileText} title="Sin resultados" />}
      {!!lista.length && (
      <Card className="overflow-hidden">
      <FilasAnimadas>
        {lista.map((op) => (
          <li key={op.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-tinta/[0.025]">
            <div className="min-w-0">
              <Link href={`/oportunidades/${op.id}`} className="font-semibold text-fg hover:text-brand">
                {op.titulo}
              </Link>
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-fg-muted">
                <span>{op.organizacion_nombre}</span>
                {[op.comuna, op.region].filter(Boolean).length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {[op.comuna, op.region].filter(Boolean).join(", ")}
                    {(op.ubicaciones?.length ?? 0) > 1 ? ` (+${op.ubicaciones.length - 1} más)` : ""}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {op.num_postulaciones} postulantes
                </span>
                <span>Creada el {formatDate(op.created_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={op.estado === "cerrada" ? "slate" : "green"}>{op.estado === "cerrada" ? "Cerrada" : "Abierta"}</Badge>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleting(op)} aria-label={`Eliminar ${op.titulo}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </li>
        ))}
      </FilasAnimadas>
      </Card>
      )}
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
            Vas a eliminar <strong>{deleting?.titulo}</strong> ({deleting?.organizacion_nombre}) junto con sus {deleting?.num_postulaciones} postulaciones.
          </>
        }
      />
    </>
  );
}
