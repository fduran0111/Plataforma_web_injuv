"use client";

import { Download, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";
import FilasAnimadas from "@/components/admin/FilasAnimadas";
import { useApi } from "@/hooks/useApi";
import { apiFetch, downloadFile, fileUrl } from "@/lib/api";
import { ROL_LABEL } from "@/lib/constants";
import { formatDate, formatRut, fullName } from "@/lib/format";
import type { Organizacion, Rol, Usuario } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

const ROL_TONE: Record<Rol, "blue" | "amber" | "red"> = { user: "blue", organizacion: "amber", admin: "red" };

export default function AdminUsuariosPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const { data, loading, error, reload } = useApi<Usuario[]>("/admin/usuarios");
  const orgs = useApi<Organizacion[]>("/admin/organizaciones");
  const [q, setQ] = useState("");
  const [rolFiltro, setRolFiltro] = useState("");
  const [rolModal, setRolModal] = useState<Usuario | null>(null);
  const [nuevoRol, setNuevoRol] = useState<Rol>("user");
  const [orgId, setOrgId] = useState("");
  const [deleting, setDeleting] = useState<Usuario | null>(null);
  const [busy, setBusy] = useState(false);

  const lista = useMemo(() => {
    const texto = q.trim().toLowerCase();
    return (data ?? []).filter(
      (u) =>
        (!rolFiltro || u.rol === rolFiltro) &&
        (!texto || [fullName(u), u.email, u.rut].some((v) => v.toLowerCase().includes(texto))),
    );
  }, [data, q, rolFiltro]);

  function abrirRol(u: Usuario) {
    setRolModal(u);
    setNuevoRol(u.rol);
    setOrgId(u.organizacion ? String(u.organizacion.id) : "");
  }

  async function cambiarRol() {
    if (!rolModal) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/usuarios/${rolModal.id}/rol`, {
        method: "PATCH",
        body: { rol: nuevoRol, organizacion_id: nuevoRol === "organizacion" && orgId ? Number(orgId) : null },
      });
      toast("Rol actualizado");
      setRolModal(null);
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
      await apiFetch(`/admin/usuarios/${deleting.id}`, { method: "DELETE" });
      toast("Usuario eliminado");
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
      <PageHeader
        title="Usuarios"
        description={`${data?.length ?? 0} cuentas registradas en la plataforma.`}
        actions={
          <Button variant="outline" onClick={() => downloadFile("/admin/usuarios/exportar", "usuarios.csv")}>
            <Download className="h-4 w-4" /> Exportar CSV
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
          <Input placeholder="Buscar por nombre, correo o RUT…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={rolFiltro} onChange={(e) => setRolFiltro(e.target.value)} options={["user", "organizacion", "admin"].map((r) => ({ value: r, label: ROL_LABEL[r] }))} placeholder="Todos los roles" />
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data && !lista.length && <EmptyState icon={Search} title="Sin resultados" />}
      {!!lista.length && (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-4 border-b border-tinta/[0.07] bg-tinta/[0.02] px-5 py-3 text-xs font-semibold uppercase tracking-[0.06em] text-fg-muted lg:grid">
            <span>Usuario</span>
            <span>RUT · Registro</span>
            <span>Rol</span>
            <span className="w-[9.5rem] text-right">Acciones</span>
          </div>
          <FilasAnimadas>
            {lista.map((u) => (
              <li
                key={u.id}
                className="grid items-center gap-x-4 gap-y-3 px-5 py-4 transition-colors hover:bg-tinta/[0.025] sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar name={fullName(u)} src={u.tiene_foto ? fileUrl.foto(u.id, u.foto_version) : null} size={40} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-fg">
                      {fullName(u)} {u.id === me?.id && <span className="text-xs font-normal text-fg-muted">(tú)</span>}
                    </p>
                    <p className="truncate text-xs text-fg-muted">
                      {u.email}
                      <span className="lg:hidden">
                        {" "}
                        · {formatRut(u.rut)} · registro {formatDate(u.created_at)}
                      </span>
                    </p>
                    {u.organizacion && <p className="truncate text-xs font-medium text-brand">Administra: {u.organizacion.nombre}</p>}
                  </div>
                </div>
                <div className="hidden min-w-0 text-sm lg:block">
                  <p className="truncate tabular-nums text-fg-secondary">{formatRut(u.rut)}</p>
                  <p className="truncate text-xs text-fg-muted">registro {formatDate(u.created_at)}</p>
                </div>
                <div className="hidden lg:block">
                  <Badge tone={ROL_TONE[u.rol]}>{ROL_LABEL[u.rol]}</Badge>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <span className="lg:hidden">
                    <Badge tone={ROL_TONE[u.rol]}>{ROL_LABEL[u.rol]}</Badge>
                  </span>
                  <Button size="sm" variant="outline" onClick={() => abrirRol(u)}>
                    Cambiar rol
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600" disabled={u.id === me?.id} onClick={() => setDeleting(u)} aria-label={`Eliminar a ${fullName(u)}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </FilasAnimadas>
        </Card>
      )}

      <Modal
        open={!!rolModal}
        onClose={() => setRolModal(null)}
        title={`Rol de ${rolModal ? fullName(rolModal) : ""}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setRolModal(null)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={cambiarRol} disabled={nuevoRol === "organizacion" && !rolModal?.organizacion && !orgId}>
              Guardar rol
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            aria-label="Rol"
            value={nuevoRol}
            onChange={(e) => setNuevoRol(e.target.value as Rol)}
            options={[
              { value: "user", label: "Voluntario/a" },
              { value: "organizacion", label: "Organización" },
              { value: "admin", label: "Administrador" },
            ]}
          />
          {nuevoRol === "organizacion" && !rolModal?.organizacion && (
            <Select
              aria-label="Organización"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              options={(orgs.data ?? []).map((o) => ({ value: o.id, label: o.nombre }))}
              placeholder="Asignar a una organización…"
            />
          )}
          {rolModal?.organizacion && nuevoRol === "organizacion" && (
            <p className="text-sm text-fg-muted">
              Ya administra <strong>{rolModal.organizacion.nombre}</strong>.
            </p>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={eliminar}
        loading={busy}
        danger
        title="Eliminar usuario"
        confirmLabel="Eliminar cuenta"
        message={
          <>
            Vas a eliminar la cuenta de <strong>{deleting ? fullName(deleting) : ""}</strong> ({deleting?.email}) junto con sus postulaciones. Esta acción no se
            puede deshacer.
          </>
        }
      />
    </>
  );
}
