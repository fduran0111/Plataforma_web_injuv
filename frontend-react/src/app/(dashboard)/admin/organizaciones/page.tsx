"use client";

import { Building2, ExternalLink, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Input, PageHeader, Spinner, Stars } from "@/components/ui";
import FilasAnimadas from "@/components/admin/FilasAnimadas";
import { useApi } from "@/hooks/useApi";
import { apiFetch, fileUrl } from "@/lib/api";
import { formatRut } from "@/lib/format";
import type { Organizacion } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

export default function AdminOrganizacionesPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Organizacion[]>("/admin/organizaciones");
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<Organizacion | null>(null);
  const [busy, setBusy] = useState(false);

  const lista = (data ?? []).filter((o) => !q.trim() || `${o.nombre} ${o.admin_nombre ?? ""} ${o.rut ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()));

  async function eliminar() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/organizaciones/${deleting.id}`, { method: "DELETE" });
      toast("Organización eliminada");
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
      <PageHeader title="Organizaciones" description={`${data?.length ?? 0} organizaciones registradas.`} />
      <div className="relative mb-6 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <Input placeholder="Buscar por nombre, admin o RUT…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && !lista.length && <EmptyState icon={Building2} title="Sin resultados" />}
      {!!lista.length && (
      <Card className="overflow-hidden">
      <FilasAnimadas>
        {lista.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-tinta/[0.025]">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={o.nombre} src={o.tiene_logo ? fileUrl.logo(o.id, o.logo_version) : null} size={44} />
              <div className="min-w-0">
                <Link href={`/organizaciones/${o.id}`} className="flex items-center gap-1.5 font-semibold text-fg hover:text-brand">
                  <span className="truncate">{o.nombre}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                </Link>
                <p className="truncate text-xs text-fg-muted">
                  {[o.rut && `RUT ${formatRut(o.rut)}`, o.region, o.area_trabajo].filter(Boolean).join(" · ")}
                </p>
                <p className="truncate text-xs text-fg-muted">
                  {o.admin_nombre ? `Admin: ${o.admin_nombre} (${o.admin_email})` : "Sin administrador asignado"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {o.calificacion_promedio != null && <Stars value={o.calificacion_promedio} size={14} />}
              <Badge tone="blue">{o.num_oportunidades ?? 0} voluntariados</Badge>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleting(o)} aria-label={`Eliminar ${o.nombre}`}>
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
        title="Eliminar organización"
        confirmLabel="Eliminar"
        message={
          <>
            Vas a eliminar <strong>{deleting?.nombre}</strong> junto con sus voluntariados y postulaciones asociadas. El administrador de la organización
            volverá a ser voluntario. Esta acción no se puede deshacer.
          </>
        }
      />
    </>
  );
}
