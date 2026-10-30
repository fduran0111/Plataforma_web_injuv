"use client";

import { CheckCircle2, Download, FileText, Plus, Search, Trash2, Upload, XCircle } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Tabs, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, downloadFile } from "@/lib/api";
import { CATEGORIAS_ACADEMIA, ESTADO_DOC_TONE } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/format";
import type { Documento, Tematica } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

type Repo = { biblioteca: Documento[]; academia: Documento[] };

function DocRow({ doc, actions }: { doc: Documento; actions: React.ReactNode }) {
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`shrink-0 rounded-xl p-2.5 ${doc.seccion === "academia" ? "bg-violet-50 text-violet-600" : "bg-brand-soft text-brand"}`}>
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold text-fg">{doc.nombre_archivo}</p>
          <p className="truncate text-xs text-fg-muted">
            {[doc.organizacion_nombre || doc.autor || "INJUV", CATEGORIAS_ACADEMIA[doc.categoria ?? ""] ?? doc.tematica_nombre, formatDate(doc.fecha_edicion || doc.created_at, ""), formatBytes(doc.archivo_tamano_bytes)]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {doc.descripcion && <p className="mt-0.5 line-clamp-1 text-xs text-fg-muted">{doc.descripcion}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </Card>
  );
}

export default function AdminRepositorioPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Repo>("/admin/repositorio");
  const tematicas = useApi<Tematica[]>("/biblioteca/tematicas");
  const [tab, setTab] = useState<"academia" | "biblioteca">("academia");
  const [q, setQ] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleting, setDeleting] = useState<Documento | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({ seccion: "biblioteca", nombre_archivo: "", descripcion: "", autor: "", tematica_id: "", categoria: "guias_manuales" });
  const fileRef = useRef<HTMLInputElement>(null);

  const docs = (data ? (tab === "academia" ? data.academia : data.biblioteca) : []).filter(
    (d) => !q.trim() || `${d.nombre_archivo} ${d.autor} ${d.organizacion_nombre ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const pendientes = data?.academia.filter((d) => d.estado === "pendiente") ?? [];

  async function setEstado(d: Documento, estado: string) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("estado", estado);
      await apiFetch(`/admin/academia/${d.id}/estado`, { method: "PATCH", body });
      toast(estado === "aprobado" ? "Recurso aprobado" : "Recurso rechazado");
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function subir(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    setFormError(null);
    if (!file) return setFormError("Adjunta el archivo");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("archivo", file);
      body.append("nombre_archivo", form.nombre_archivo.trim());
      body.append("descripcion", form.descripcion.trim());
      body.append("autor", form.autor.trim());
      if (form.seccion === "biblioteca" && form.tematica_id) body.append("tematica_id", form.tematica_id);
      if (form.seccion === "academia") body.append("categoria", form.categoria);
      await apiFetch(`/admin/repositorio/${form.seccion}`, { method: "POST", body });
      toast("Documento publicado");
      setUploadOpen(false);
      setForm({ ...form, nombre_archivo: "", descripcion: "", autor: "" });
      if (fileRef.current) fileRef.current.value = "";
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function eliminar() {
    if (!deleting) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/repositorio/${deleting.seccion}/${deleting.id}`, { method: "DELETE" });
      toast("Documento eliminado");
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
        title="Repositorio"
        description="Documentos de la Biblioteca y revisión de la Academia."
        actions={
          <Button onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4" /> Subir documento
          </Button>
        }
      />
      <div className="mb-6">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "academia", label: "Academia", count: data?.academia.length },
            { value: "biblioteca", label: "Biblioteca", count: data?.biblioteca.length },
          ]}
        />
      </div>
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}

      {tab === "academia" && !!pendientes.length && (
        <Alert tone="amber" className="mb-5">
          {pendientes.length} {pendientes.length === 1 ? "recurso pendiente" : "recursos pendientes"} de revisión — aparecen marcados abajo.
        </Alert>
      )}

      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" />
        <Input placeholder="Buscar documento…" className="pl-10" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {data && !docs.length && <EmptyState icon={FileText} title="Sin documentos" />}
      <div className="space-y-3">
        {docs.map((d) => (
          <DocRow
            key={d.id}
            doc={d}
            actions={
              <>
                {d.estado && <Badge tone={ESTADO_DOC_TONE[d.estado]}>{d.estado}</Badge>}
                {d.estado === "pendiente" && (
                  <>
                    <Button size="sm" loading={busy} onClick={() => setEstado(d, "aprobado")}>
                      <CheckCircle2 className="h-4 w-4" /> Aprobar
                    </Button>
                    <Button size="sm" variant="danger" loading={busy} onClick={() => setEstado(d, "rechazado")}>
                      <XCircle className="h-4 w-4" /> Rechazar
                    </Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => downloadFile(`/repositorio/${d.seccion}/${d.id}/descargar`, d.nombre_archivo)}>
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleting(d)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            }
          />
        ))}
      </div>

      <Modal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Subir documento"
        footer={
          <>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={subir}>
              <Plus className="h-4 w-4" /> Publicar
            </Button>
          </>
        }
      >
        <form onSubmit={subir} className="space-y-4">
          {formError && <Alert>{formError}</Alert>}
          <Field label="Sección" required>
            {(id) => (
              <Select
                id={id}
                value={form.seccion}
                onChange={(e) => setForm((f) => ({ ...f, seccion: e.target.value }))}
                options={[
                  { value: "biblioteca", label: "Biblioteca (investigaciones y estudios)" },
                  { value: "academia", label: "Academia (guías y materiales)" },
                ]}
              />
            )}
          </Field>
          <Field label="Título" hint="Si lo dejas vacío se usa el nombre del archivo">
            {(id) => <Input id={id} maxLength={255} value={form.nombre_archivo} onChange={(e) => setForm((f) => ({ ...f, nombre_archivo: e.target.value }))} />}
          </Field>
          <Field label="Descripción" required={form.seccion === "academia"}>
            {(id) => <Textarea id={id} maxLength={500} value={form.descripcion} onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))} />}
          </Field>
          <Field label="Autor">
            {(id) => <Input id={id} maxLength={150} placeholder="INJUV" value={form.autor} onChange={(e) => setForm((f) => ({ ...f, autor: e.target.value }))} />}
          </Field>
          {form.seccion === "biblioteca" ? (
            <Field label="Temática">
              {(id) => (
                <Select
                  id={id}
                  value={form.tematica_id}
                  onChange={(e) => setForm((f) => ({ ...f, tematica_id: e.target.value }))}
                  options={(tematicas.data ?? []).map((t) => ({ value: t.id, label: t.nombre }))}
                  placeholder="Sin temática"
                />
              )}
            </Field>
          ) : (
            <Field label="Categoría" required>
              {(id) => (
                <Select
                  id={id}
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  options={Object.entries(CATEGORIAS_ACADEMIA).map(([value, label]) => ({ value, label }))}
                />
              )}
            </Field>
          )}
          <Field label="Archivo" required hint={form.seccion === "academia" ? "PDF, imágenes o videos (máx. 500 MB)" : "Documentos (máx. 50 MB)"}>
            {() => <input ref={fileRef} type="file" className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand" />}
          </Field>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={eliminar}
        loading={busy}
        danger
        title="Eliminar documento"
        confirmLabel="Eliminar"
        message={<>Vas a eliminar <strong>{deleting?.nombre_archivo}</strong>.</>}
      />
    </>
  );
}
