"use client";

import { Award, Camera, ImageIcon, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Avatar, Button, Card, ErrorState, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import UbicacionFields from "@/components/UbicacionFields";
import RecortarFoto from "@/components/perfil/RecortarFoto";
import { apiFetch, fileUrl } from "@/lib/api";
import { AREAS_VOLUNTARIADO } from "@/lib/constants";
import type { Organizacion } from "@/lib/types";
import { useApi } from "@/hooks/useApi";
import { useToast } from "@/providers/ToastProvider";

const TIPOS_ORG = ["Fundación", "Corporación", "ONG", "Municipalidad", "Universidad", "Colegio", "Comunidad", "Otra"];

export default function PerfilOrgPage() {
  const { data: org, loading, error, reload, setData } = useApi<Organizacion>("/organizaciones/mia");
  if (loading && !org) return <Spinner />;
  if (error || !org) return <ErrorState message={error ?? "No se pudo cargar"} onRetry={reload} />;
  return <Editor org={org} onSaved={setData} />;
}

function Editor({ org, onSaved }: { org: Organizacion; onSaved: (o: Organizacion) => void }) {
  const toast = useToast();
  const [form, setForm] = useState<Organizacion>(org);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const [bannerPorRecortar, setBannerPorRecortar] = useState<File | null>(null);
  const [subiendoBanner, setSubiendoBanner] = useState(false);
  const certRef = useRef<HTMLInputElement>(null);
  const [certNombre, setCertNombre] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deletingCert, setDeletingCert] = useState<string | null>(null);
  const [nuevaRed, setNuevaRed] = useState("");

  const set = (k: keyof Organizacion) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => (f ? { ...f, [k]: e.target.value } : f));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const f = form!;
      const updated = await apiFetch<Organizacion>("/organizaciones/mia", {
        method: "PUT",
        body: {
          nombre: f.nombre,
          siglas_nombre: f.siglas_nombre || null,
          email_contacto: f.email_contacto || null,
          telefono_contacto: f.telefono_contacto || null,
          region: f.region || null,
          ciudad: f.ciudad || null,
          comuna: f.comuna || null,
          descripcion: f.descripcion || null,
          descripcion_breve: f.descripcion_breve || null,
          area_trabajo: f.area_trabajo || null,
          tipo_org: f.tipo_org || null,
          sitio_web: f.sitio_web || null,
          redes_sociales: f.redes_sociales,
          experiencia_anios: f.experiencia_anios,
          voluntarios_anuales: f.voluntarios_anuales || null,
        },
      });
      onSaved(updated);
      setForm(updated);
      toast("Perfil actualizado");
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const [porRecortar, setPorRecortar] = useState<File | null>(null);

  function elegirLogo(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      toast("JPG o PNG, máx. 5 MB", "error");
      return;
    }
    setPorRecortar(file);
    if (logoRef.current) logoRef.current.value = "";
  }

  async function subirLogo(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("imagen", file);
      const updated = await apiFetch<Organizacion>("/organizaciones/mia/logo", { method: "POST", body });
      onSaved(updated);
      setForm(updated);
      toast("Logo actualizado");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
      if (logoRef.current) logoRef.current.value = "";
    }
  }

  async function eliminarLogo() {
    setUploading(true);
    try {
      const updated = await apiFetch<Organizacion>("/organizaciones/mia/logo", { method: "DELETE" });
      onSaved(updated);
      setForm(updated);
      toast("Logo eliminado");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
    }
  }

  function elegirBanner(file: File | undefined) {
    if (bannerRef.current) bannerRef.current.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
      toast("JPG o PNG, máx. 15 MB", "error");
      return;
    }
    setBannerPorRecortar(file);
  }

  async function cambiarBanner(file: File | null) {
    setSubiendoBanner(true);
    try {
      let updated: Organizacion;
      if (file) {
        const body = new FormData();
        body.append("imagen", file);
        updated = await apiFetch<Organizacion>("/organizaciones/mia/banner", { method: "POST", body });
      } else {
        updated = await apiFetch<Organizacion>("/organizaciones/mia/banner", { method: "DELETE" });
      }
      onSaved(updated);
      setForm(updated);
      toast(file ? "Foto de portada actualizada" : "Foto de portada eliminada");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSubiendoBanner(false);
    }
  }

  async function subirCertificacion(file: File | undefined) {
    if (!file) return;
    if (certNombre.trim().length < 2) return toast("Indica el nombre del documento", "info");
    setUploading(true);
    try {
      const body = new FormData();
      body.append("nombre", certNombre.trim());
      body.append("archivo", file);
      const updated = await apiFetch<Organizacion>("/organizaciones/mia/certificaciones", { method: "POST", body });
      onSaved(updated);
      setForm(updated);
      setCertNombre("");
      toast("Certificación subida");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setUploading(false);
      if (certRef.current) certRef.current.value = "";
    }
  }

  async function eliminarCertificacion(archivo: string) {
    setDeletingCert(archivo);
    try {
      const updated = await apiFetch<Organizacion>(`/organizaciones/mia/certificaciones/${encodeURIComponent(archivo)}`, { method: "DELETE" });
      onSaved(updated);
      setForm(updated);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setDeletingCert(null);
    }
  }

  return (
    <>
      <form onSubmit={guardar} className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden text-center">
            <div className="group relative aspect-[2/1] bg-tinta">
              {form.tiene_banner ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fileUrl.banner(form.id, form.banner_version)} alt="Foto de portada actual" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center gap-2 pb-10 text-xs text-papel/60 transition-opacity duration-200 group-hover:opacity-0">
                  <ImageIcon className="h-4 w-4" /> Sin foto de portada
                </div>
              )}
              <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => elegirBanner(e.target.files?.[0])} />
              <button
                type="button"
                disabled={subiendoBanner}
                onClick={() => bannerRef.current?.click()}
                className={`absolute inset-0 flex items-center justify-center gap-2 bg-tinta/60 pb-10 text-sm font-semibold text-papel outline-none transition-opacity duration-200 ease-[var(--ease-out)] focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100 ${subiendoBanner ? "opacity-100" : "opacity-0"}`}
              >
                <Camera className="h-4 w-4" /> {subiendoBanner ? "Subiendo…" : form.tiene_banner ? "Cambiar portada" : "Subir portada"}
              </button>
              {form.tiene_banner && !subiendoBanner && (
                <button
                  type="button"
                  aria-label="Quitar foto de portada"
                  title="Quitar foto de portada"
                  onClick={() => cambiarBanner(null)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-tinta/70 text-papel opacity-0 outline-none transition-[opacity,background-color] duration-200 ease-[var(--ease-out)] hover:bg-brand-red focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="px-6 pb-6">
              <div className="group/logo relative mx-auto -mt-[52px] w-fit">
                <Avatar name={form.nombre} src={form.tiene_logo ? fileUrl.logo(form.id, form.logo_version) : null} size={104} className="ring-4 ring-surface" />
                <input ref={logoRef} type="file" accept="image/*" className="hidden" onChange={(e) => elegirLogo(e.target.files?.[0])} />
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => logoRef.current?.click()}
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-tinta/85 backdrop-blur-[2px] text-xs font-semibold text-papel outline-none ring-4 ring-surface transition-opacity duration-200 ease-[var(--ease-out)] focus-visible:opacity-100 group-hover/logo:opacity-100 [@media(hover:none)]:opacity-100 ${uploading ? "opacity-100" : "opacity-0"}`}
                >
                  <Camera className="h-4 w-4" /> {uploading ? "Subiendo…" : form.tiene_logo ? "Cambiar logo" : "Subir logo"}
                </button>
                {form.tiene_logo && !uploading && (
                  <button
                    type="button"
                    aria-label="Quitar logo"
                    title="Quitar logo"
                    onClick={eliminarLogo}
                    className="absolute -right-1 bottom-0 grid h-8 w-8 place-items-center rounded-full bg-tinta text-papel opacity-0 outline-none ring-2 ring-surface transition-[opacity,background-color] duration-200 ease-[var(--ease-out)] hover:bg-brand-red focus-visible:opacity-100 group-hover/logo:opacity-100 [@media(hover:none)]:opacity-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <RecortarFoto file={porRecortar} titulo="Ajusta el logo" formato="image/png" onCancel={() => setPorRecortar(null)} onConfirm={async (f) => { await subirLogo(f); setPorRecortar(null); }} />
              <RecortarFoto
                file={bannerPorRecortar}
                titulo="Encuadra la foto de portada"
                mascara="rect"
                formato="image/jpeg"
                aspecto={2}
                anchoSalida={2000}
                descripcion="El nombre y las cifras van sobre la parte de abajo: deja lo importante de la foto arriba o al centro."
                onCancel={() => setBannerPorRecortar(null)}
                onConfirm={async (f) => {
                  setBannerPorRecortar(null);
                  await cambiarBanner(f);
                }}
              />
              <p className="mt-4 text-xs text-fg-muted">Pasa el mouse sobre la portada o el logo para cambiarlos. La portada se muestra de fondo en tu página pública.</p>
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold text-fg">Certificaciones</h3>
            <p className="mt-1 text-xs text-fg-muted">Documentos de respaldo visibles en tu perfil público.</p>
            <ul className="mt-4 space-y-2">
              {form.certificacion.map((c) => (
                <li key={c.archivo} className="flex items-center justify-between gap-2 rounded-lg bg-page px-3 py-2 text-sm">
                  <a href={fileUrl.certificacionOrg(form.id, c.archivo)} className="flex min-w-0 items-center gap-2 truncate text-fg-secondary hover:text-brand">
                    <Award className="h-4 w-4 shrink-0 text-amber-500" />
                    <span className="truncate">{c.nombre}</span>
                  </a>
                  <button type="button" aria-label="Eliminar" onClick={() => eliminarCertificacion(c.archivo)} className="text-fg-muted hover:text-red-600">
                    {deletingCert === c.archivo ? "…" : <Trash2 className="h-4 w-4" />}
                  </button>
                </li>
              ))}
              {!form.certificacion.length && <p className="text-sm text-fg-muted">Aún no hay certificaciones.</p>}
            </ul>
            <div className="mt-4 space-y-2">
              <Input placeholder="Nombre del documento" value={certNombre} onChange={(e) => setCertNombre(e.target.value)} />
              <input ref={certRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => subirCertificacion(e.target.files?.[0])} />
              <Button size="sm" variant="outline" loading={uploading} onClick={() => certRef.current?.click()}>
                <Plus className="h-4 w-4" /> Subir certificación
              </Button>
            </div>
          </Card>
        </div>

        <Card className="h-fit p-6 sm:p-8">
          <h2 className="font-semibold text-fg">Datos de la organización</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {formError && <Alert className="sm:col-span-2">{formError}</Alert>}
            <Field label="Nombre" required className="sm:col-span-2">
              {(id) => <Input id={id} required maxLength={100} value={form.nombre} onChange={set("nombre")} />}
            </Field>
            <Field label="Siglas">
              {(id) => <Input id={id} maxLength={100} value={form.siglas_nombre} onChange={set("siglas_nombre")} />}
            </Field>
            <Field label="Tipo de organización">
              {(id) => <Select id={id} value={form.tipo_org} onChange={set("tipo_org")} options={TIPOS_ORG} placeholder="Selecciona" />}
            </Field>
            <Field label="Área de trabajo">
              {(id) => <Select id={id} value={form.area_trabajo} onChange={set("area_trabajo")} options={AREAS_VOLUNTARIADO} placeholder="Selecciona" />}
            </Field>
            <Field label="Años de experiencia">
              {(id) => <Input id={id} type="number" min={0} max={200} value={form.experiencia_anios ?? ""} onChange={(e) => setForm((f) => f && { ...f, experiencia_anios: e.target.value ? Number(e.target.value) : null })} />}
            </Field>
            <Field label="Correo de contacto" hint="Aquí te llegan las respuestas de los voluntarios a los correos que envías desde la plataforma">
              {(id) => <Input id={id} type="email" value={form.email_contacto} onChange={set("email_contacto")} />}
            </Field>
            <Field label="Teléfono de contacto">
              {(id) => <Input id={id} type="tel" value={form.telefono_contacto} onChange={set("telefono_contacto")} />}
            </Field>
            <UbicacionFields
              region={form.region}
              ciudad={form.ciudad}
              comuna={form.comuna}
              onChange={(patch) => setForm((f) => f && { ...f, ...patch })}
            />
            <Field label="Voluntarios por año">
              {(id) => <Input id={id} placeholder="Ej: 50-100" value={form.voluntarios_anuales} onChange={set("voluntarios_anuales")} />}
            </Field>
            <Field label="Sitio web">
              {(id) => <Input id={id} type="url" placeholder="https://…" value={form.sitio_web} onChange={set("sitio_web")} />}
            </Field>
            <Field label="Descripción breve" hint="Se muestra en el directorio (máx. 500)" className="sm:col-span-2">
              {(id) => <Textarea id={id} maxLength={500} value={form.descripcion_breve} onChange={set("descripcion_breve")} className="min-h-20" />}
            </Field>
            <Field label="Descripción completa" className="sm:col-span-2">
              {(id) => <Textarea id={id} maxLength={5000} value={form.descripcion} onChange={set("descripcion")} />}
            </Field>
            <div className="sm:col-span-2">
              <p className="mb-2 text-sm font-medium text-fg-secondary">Redes sociales</p>
              <div className="flex flex-wrap gap-2">
                {form.redes_sociales.map((r, i) => (
                  <span key={r} className="inline-flex items-center gap-2 rounded-full bg-page px-3 py-1.5 text-xs text-fg-secondary">
                    <span className="max-w-56 truncate">{r}</span>
                    <button
                      type="button"
                      aria-label="Quitar"
                      onClick={() => setForm((f) => f && { ...f, redes_sociales: f.redes_sociales.filter((_, j) => j !== i) })}
                      className="text-fg-muted hover:text-red-600"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex gap-2">
                  <Input placeholder="https://…" className="h-8 w-52 text-xs" value={nuevaRed} onChange={(e) => setNuevaRed(e.target.value)} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!nuevaRed.trim()}
                    onClick={() => {
                      setForm((f) => f && { ...f, redes_sociales: [...f.redes_sociales, nuevaRed.trim()] });
                      setNuevaRed("");
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>
                Guardar cambios
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </>
  );
}
