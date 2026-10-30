"use client";

import { CalendarDays, Download, GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, downloadFile } from "@/lib/api";
import { CATEGORIAS_ACADEMIA, ESTADO_DOC_TONE } from "@/lib/constants";
import { formatBytes, formatDate } from "@/lib/format";
import type { Documento } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

type DocForm = { id: number | null; nombre_archivo: string; descripcion: string; categoria: string; fecha_creacion: string };

const EMPTY: DocForm = { id: null, nombre_archivo: "", descripcion: "", categoria: "guias_manuales", fecha_creacion: "" };

export default function AcademiaOrgPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Documento[]>("/organizaciones/mia/academia");
  const [form, setForm] = useState<(DocForm & { open: boolean }) | null>(null);
  const [deleting, setDeleting] = useState<Documento | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function guardar(file: File | undefined) {
    if (!form) return;
    setFormError(null);
    setSaving(true);
    try {
      const body = new FormData();
      body.append("nombre_archivo", form.nombre_archivo.trim());
      body.append("descripcion", form.descripcion.trim());
      body.append("categoria", form.categoria);
      if (form.fecha_creacion) body.append("fecha_creacion", form.fecha_creacion);
      if (form.id === null) {
        if (!file) throw new Error("Adjunta el archivo del recurso");
        body.append("archivo", file);
        await apiFetch("/organizaciones/mia/academia", { method: "POST", body });
      } else {
        await apiFetch(`/organizaciones/mia/academia/${form.id}`, { method: "PUT", body });
      }
      toast(form.id === null ? "Recurso enviado a revisión" : "Recurso actualizado");
      setForm(null);
      reload();
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminar() {
    if (!deleting) return;
    setSaving(true);
    try {
      await apiFetch(`/organizaciones/mia/academia/${deleting.id}`, { method: "DELETE" });
      toast("Recurso eliminado");
      setDeleting(null);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Academia de voluntariado"
        description="Comparte guías, plantillas y videos con la comunidad. Cada recurso nuevo pasa por revisión de un administrador antes de publicarse."
        actions={
          <Button onClick={() => setForm({ ...EMPTY, open: true })}>
            <Plus className="h-4 w-4" /> Nuevo recurso
          </Button>
        }
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title="Aún no compartes recursos"
          description="Sube tu primera guía o plantilla para ayudar a otros voluntarios y organizaciones."
          action={
            <Button onClick={() => setForm({ ...EMPTY, open: true })}>
              <Plus className="h-4 w-4" /> Nuevo recurso
            </Button>
          }
        />
      )}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {data?.map((d) => (
          <Card key={d.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between gap-3">
              <Badge tone="violet">{CATEGORIAS_ACADEMIA[d.categoria ?? ""] ?? d.categoria}</Badge>
              <Badge tone={ESTADO_DOC_TONE[d.estado ?? "pendiente"]}>{d.estado}</Badge>
            </div>
            <h3 className="mt-3 line-clamp-2 font-semibold text-fg">{d.nombre_archivo}</h3>
            <p className="mt-1 line-clamp-3 flex-1 text-sm text-fg-muted">{d.descripcion}</p>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-fg-muted">
              <CalendarDays className="h-3.5 w-3.5" />
              {[formatDate(d.fecha_edicion || d.created_at), formatBytes(d.archivo_tamano_bytes)].filter(Boolean).join(" · ")}
            </p>
            <div className="mt-4 flex gap-2 border-t border-border pt-4">
              <Button size="sm" variant="secondary" onClick={() => downloadFile(`/repositorio/academia/${d.id}/descargar`, d.nombre_archivo)}>
                <Download className="h-4 w-4" /> Descargar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setForm({ id: d.id, nombre_archivo: d.nombre_archivo, descripcion: d.descripcion, categoria: d.categoria ?? "guias_manuales", fecha_creacion: "", open: true })}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleting(d)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? "Editar recurso" : "Nuevo recurso para la Academia"}
        description={form?.id ? "Los cambios quedarán pendientes de revisión." : "Un administrador lo revisará antes de publicarlo."}
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button loading={saving} disabled={!form?.nombre_archivo.trim() || form.descripcion.trim().length < 5} onClick={() => guardar(fileRef.current?.files?.[0])}>
              {form?.id ? "Guardar" : "Enviar a revisión"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <Alert>{formError}</Alert>}
          <Field label="Título del recurso" required>
            {(fid) => <Input id={fid} maxLength={255} value={form?.nombre_archivo ?? ""} onChange={(e) => setForm((f) => f && { ...f, nombre_archivo: e.target.value })} />}
          </Field>
          <Field label="Categoría" required>
            {(fid) => (
              <Select
                id={fid}
                value={form?.categoria}
                onChange={(e) => setForm((f) => f && { ...f, categoria: e.target.value })}
                options={Object.entries(CATEGORIAS_ACADEMIA).map(([value, label]) => ({ value, label }))}
              />
            )}
          </Field>
          <Field label="Descripción" required hint="Mínimo 5 caracteres">
            {(fid) => <Textarea id={fid} maxLength={500} value={form?.descripcion ?? ""} onChange={(e) => setForm((f) => f && { ...f, descripcion: e.target.value })} />}
          </Field>
          <Field label="Fecha de creación del material">
            {(fid) => <Input id={fid} type="date" value={form?.fecha_creacion ?? ""} onChange={(e) => setForm((f) => f && { ...f, fecha_creacion: e.target.value })} />}
          </Field>
          {form?.id === null && (
            <Field label="Archivo" required hint="PDF, imágenes o video">
              {() => <input ref={fileRef} type="file" className="block w-full text-sm text-fg-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand" />}
            </Field>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={eliminar}
        loading={saving}
        danger
        title="Eliminar recurso"
        confirmLabel="Eliminar"
        message={<>Vas a eliminar <strong>{deleting?.nombre_archivo}</strong> de la Academia.</>}
      />
    </>
  );
}
