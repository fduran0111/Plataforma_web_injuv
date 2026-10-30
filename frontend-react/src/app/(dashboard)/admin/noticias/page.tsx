"use client";

import { Newspaper, Pencil, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Alert, Badge, Button, Card, ConfirmModal, EmptyState, ErrorState, Field, Input, Modal, PageHeader, Select, Spinner, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, fileUrl } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Noticia } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

const ESTADOS = [
  { value: "activa", label: "Publicada" },
  { value: "borrador", label: "Borrador" },
  { value: "inactiva", label: "Oculta" },
];
const TONE = { activa: "green" as const, borrador: "amber" as const, inactiva: "slate" as const };

type FormState = { titulo: string; resumen: string; contenido: string; estado: string; quitar_imagen: boolean };

const EMPTY: FormState = { titulo: "", resumen: "", contenido: "", estado: "activa", quitar_imagen: false };

export default function AdminNoticiasPage() {
  const toast = useToast();
  const { data, loading, error, reload } = useApi<Noticia[]>("/noticias/admin");
  const [editing, setEditing] = useState<Noticia | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<Noticia | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const open = (n: Noticia | null) => {
    setEditing(n);
    setForm(n ? { titulo: n.titulo, resumen: n.resumen, contenido: n.contenido, estado: n.estado, quitar_imagen: false } : EMPTY);
    setFormError(null);
  };

  async function guardar(file: File | undefined) {
    if (!form) return;
    setFormError(null);
    setSaving(true);
    try {
      const body = new FormData();
      body.append("titulo", form.titulo.trim());
      body.append("contenido", form.contenido.trim());
      body.append("resumen", form.resumen.trim());
      body.append("estado", form.estado);
      if (file) body.append("imagen", file);
      if (editing) {
        body.append("quitar_imagen", String(form.quitar_imagen && !file));
        await apiFetch(`/noticias/${editing.id}`, { method: "PUT", body });
      } else {
        await apiFetch("/noticias", { method: "POST", body });
      }
      toast(editing ? "Noticia actualizada" : "Noticia publicada");
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
      await apiFetch(`/noticias/${deleting.id}`, { method: "DELETE" });
      toast("Noticia eliminada");
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
        title="Noticias"
        description="Publica novedades visibles en la página de inicio y en /noticias."
        actions={
          <Button onClick={() => open(null)}>
            <Plus className="h-4 w-4" /> Nueva noticia
          </Button>
        }
      />
      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && <Spinner />}
      {data?.length === 0 && <EmptyState icon={Newspaper} title="Aún no hay noticias" />}
      <div className="space-y-3">
        {data?.map((n) => (
          <Card key={n.id} className="flex items-center gap-4 p-4">
            {n.imagen && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl.noticia(n.imagen)} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/noticias/${n.id}`} className="font-semibold text-fg hover:text-brand">
                {n.titulo}
              </Link>
              <p className="truncate text-xs text-fg-muted">
                {formatDate(n.fecha_publicacion)} · por {n.autor_nombre}
              </p>
            </div>
            <Badge tone={TONE[n.estado]}>{ESTADOS.find((e) => e.value === n.estado)?.label}</Badge>
            <Button size="sm" variant="outline" onClick={() => open(n)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleting(n)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </Card>
        ))}
      </div>

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={editing ? "Editar noticia" : "Nueva noticia"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button loading={saving} disabled={!form || form.titulo.trim().length < 3 || form.contenido.trim().length < 10} onClick={() => guardar(fileRef.current?.files?.[0])}>
              {editing ? "Guardar cambios" : "Publicar"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && <Alert>{formError}</Alert>}
          <Field label="Título" required>
            {(id) => <Input id={id} maxLength={200} value={form?.titulo ?? ""} onChange={(e) => setForm((f) => f && { ...f, titulo: e.target.value })} />}
          </Field>
          <Field label="Resumen" hint="Se muestra en las tarjetas del listado">
            {(id) => <Textarea id={id} maxLength={500} className="min-h-20" value={form?.resumen ?? ""} onChange={(e) => setForm((f) => f && { ...f, resumen: e.target.value })} />}
          </Field>
          <Field label="Contenido" required>
            {(id) => <Textarea id={id} className="min-h-44" value={form?.contenido ?? ""} onChange={(e) => setForm((f) => f && { ...f, contenido: e.target.value })} />}
          </Field>
          <Field label="Estado">
            {(id) => <Select id={id} value={form?.estado} onChange={(e) => setForm((f) => f && { ...f, estado: e.target.value })} options={ESTADOS} />}
          </Field>
          <Field label="Imagen de portada" hint="JPG o PNG, máx. 5 MB">
            {() => <input ref={fileRef} type="file" accept="image/*" className="block w-full text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:font-semibold file:text-brand" />}
          </Field>
          {editing?.imagen && !form?.quitar_imagen && (
            <div className="flex items-center justify-between rounded-xl bg-page p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fileUrl.noticia(editing.imagen)} alt="" className="h-12 w-16 rounded object-cover" />
              <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setForm((f) => f && { ...f, quitar_imagen: true })}>
                Quitar imagen
              </Button>
            </div>
          )}
          {editing?.imagen && form?.quitar_imagen && <Alert tone="amber">La imagen actual se eliminará al guardar.</Alert>}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={eliminar}
        loading={saving}
        danger
        title="Eliminar noticia"
        confirmLabel="Eliminar"
        message={<>Vas a eliminar <strong>{deleting?.titulo}</strong>.</>}
      />
    </>
  );
}
