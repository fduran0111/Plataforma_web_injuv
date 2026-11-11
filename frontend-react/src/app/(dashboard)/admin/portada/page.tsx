"use client";

import { ArrowDown, ArrowRight, ArrowUp, Crop, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import RecortarFoto from "@/components/perfil/RecortarFoto";
import { Alert, Button, Card, ConfirmModal, Field, Input, Modal, Spinner, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, fileUrl, getStoredToken } from "@/lib/api";
import type { PortadaAdmin, PortadaFoto } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

/** Tras guardar, pide a Next revalidar "/" para publicar al instante (errores ignorados). */
function refrescarPortada() {
  const token = getStoredToken();
  if (token) void fetch("/api/revalidar-portada", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}

const DEF = {
  etiqueta: "Programa nacional de voluntariado juvenil",
  titulo_linea1: "Súmate a las causas",
  titulo_linea2: "que",
  titulo_resaltado: "mueven a Chile",
  subtitulo: "Encuentra voluntariados cerca de ti, postula en minutos y certifica tu experiencia con organizaciones de todo el país.",
};

function SeccionFotos({ titulo, seccion, fotos, reload }: { titulo: string; seccion: "inicio" | "galeria"; fotos: PortadaFoto[]; reload: (d: PortadaAdmin) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [altNueva, setAltNueva] = useState("");
  const [pendiente, setPendiente] = useState<File | null>(null);
  const [recorte, setRecorte] = useState<{ modo: "nueva" | "editar"; file: File; fotoId?: number; sinOriginal?: boolean } | null>(null);
  const [reId, setReId] = useState<number | null>(null);
  const origRef = useRef<File | null>(null);
  const [borrar, setBorrar] = useState<PortadaFoto | null>(null);
  const [alts, setAlts] = useState<Record<number, string>>({});

  const mutar = async (p: Promise<PortadaAdmin>, ok: string) => {
    try {
      reload(await p);
      toast(ok);
      refrescarPortada();
    } catch (e) {
      toast((e as Error).message, "error");
    }
  };
  const mover = (i: number, dir: -1 | 1) => {
    const ids = fotos.map((f) => f.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    void mutar(apiFetch("/portada/fotos/orden", { method: "PUT", body: { seccion, ids } }), "Orden actualizado");
  };
  const recuadrar = async (f: PortadaFoto) => {
    setReId(f.id);
    try {
      const res = await fetch(fileUrl.portada(f.archivo_original ?? f.archivo));
      if (!res.ok) throw new Error("No pudimos descargar la foto");
      const blob = await res.blob();
      setRecorte({ modo: "editar", file: new File([blob], f.archivo_original ?? f.archivo, { type: blob.type }), fotoId: f.id, sinOriginal: !f.archivo_original });
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setReId(null);
    }
  };
  const subir = async () => {
    if (!pendiente) return;
    const body = new FormData();
    body.append("seccion", seccion);
    body.append("alt", altNueva.trim());
    body.append("imagen", pendiente);
    if (origRef.current) body.append("original", origRef.current);
    await mutar(apiFetch("/portada/fotos", { method: "POST", body }), "Foto subida");
    origRef.current = null;
    setPendiente(null);
    setAltNueva("");
  };

  return (
    <Card className="p-6">
      <h2 className="mb-1 text-xl font-semibold text-fg">{titulo}</h2>
      <p className="mb-4 text-xs text-fg-muted">Recomendado: fotos horizontales; podrás encuadrarlas antes de subirlas (máx. 15 MB el original).</p>
      {!fotos.some((f) => f.activa) && <Alert tone="amber">No hay fotos activas: el sitio está usando sus fotos por defecto.</Alert>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fotos.map((f, i) => (
          <div key={f.id} className="relative">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-papel-strong">
              <Image src={fileUrl.portada(f.archivo)} alt={f.alt} fill unoptimized className="object-cover" />
            </div>
            {f.activa === false && <span className="absolute left-2 top-2 rounded-full bg-tinta/80 px-2 py-0.5 text-xs font-semibold text-papel">Oculta</span>}
            <Input
              aria-label="Descripción de la foto"
              value={alts[f.id] ?? f.alt}
              onChange={(e) => setAlts((a) => ({ ...a, [f.id]: e.target.value }))}
              onBlur={() => alts[f.id] !== undefined && alts[f.id] !== f.alt && void mutar(apiFetch(`/portada/fotos/${f.id}`, { method: "PATCH", body: { alt: alts[f.id] } }), "Descripción guardada")}
              className="mt-2"
            />
            <div className="mt-2 flex gap-1">
              <Button size="sm" variant="ghost" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" aria-label="Bajar" disabled={i === fotos.length - 1} onClick={() => mover(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" aria-label="Encuadrar de nuevo" title="Encuadrar de nuevo" loading={reId === f.id} onClick={() => void recuadrar(f)}>
                <Crop className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" aria-label={f.activa ? "Ocultar" : "Mostrar"} onClick={() => void mutar(apiFetch(`/portada/fotos/${f.id}`, { method: "PATCH", body: { activa: !f.activa } }), f.activa ? "Foto ocultada" : "Foto visible")}>
                {f.activa ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="ghost" aria-label="Eliminar" className="text-red-600" onClick={() => setBorrar(f)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (fileRef.current) fileRef.current.value = "";
          if (!f) return;
          if (!f.type.startsWith("image/") || f.size > 15 * 1024 * 1024) return toast("Imagen JPG o PNG, máx. 15 MB", "error");
          origRef.current = f;
          setRecorte({ modo: "nueva", file: f });
        }}
      />
      <RecortarFoto
        file={recorte?.file ?? null}
        mascara="rect"
        formato="image/jpeg"
        aspecto={seccion === "inicio" ? 16 / 9 : 3 / 2}
        anchoSalida={seccion === "inicio" ? 1920 : 1800}
        anchoMinimo={seccion === "inicio" ? 1600 : 1200}
        titulo={recorte?.modo === "editar" ? "Encuadra de nuevo la foto" : seccion === "inicio" ? "Encuadra la foto del inicio" : "Encuadra la foto del carrusel"}
        descripcion={
          recorte?.sinOriginal
            ? "Esta foto se subió sin original: reencuadrarla puede reducir su calidad."
            : recorte?.modo === "editar"
              ? "Se usa la foto original completa para volver a encuadrar."
              : seccion === "inicio"
                ? "Se verá de fondo en el bloque principal. En celulares se recorta a lo alto desde el centro."
                : "Así se verá en el carrusel. En celulares se muestra más vertical, centrada."
        }
        onCancel={() => setRecorte(null)}
        onConfirm={async (f) => {
          const r = recorte;
          setRecorte(null);
          if (r?.modo === "editar" && r.fotoId) {
            const body = new FormData();
            body.append("imagen", f);
            await mutar(apiFetch(`/portada/fotos/${r.fotoId}/imagen`, { method: "PUT", body }), "Encuadre actualizado");
          } else {
            setPendiente(f);
          }
        }}
      />
      <Button size="sm" variant="outline" className="mt-4" onClick={() => fileRef.current?.click()}>
        <Plus className="h-4 w-4" /> Subir foto
      </Button>
      <Modal
        open={!!pendiente}
        title="Nueva foto"
        onClose={() => setPendiente(null)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPendiente(null)}>Cancelar</Button>
            <Button onClick={subir} disabled={altNueva.trim().length < 3}>Subir</Button>
          </div>
        }
      >
        <Field label="Descripción de la foto (para accesibilidad)" required hint="Mínimo 3 caracteres">
          {(id) => <Input id={id} value={altNueva} onChange={(e) => setAltNueva(e.target.value)} maxLength={200} />}
        </Field>
      </Modal>
      <ConfirmModal
        open={!!borrar}
        title="Eliminar foto"
        confirmLabel="Eliminar"
        danger
        message={`Vas a eliminar esta foto de la sección ${seccion}. Se borrará también el archivo.`}
        onClose={() => setBorrar(null)}
        onConfirm={async () => {
          await mutar(apiFetch(`/portada/fotos/${borrar?.id}`, { method: "DELETE" }), "Foto eliminada");
          setBorrar(null);
        }}
      />
    </Card>
  );
}

export default function AdminPortadaPage() {
  const toast = useToast();
  const { data, loading, setData } = useApi<PortadaAdmin>("/portada/admin");
  const [form, setForm] = useState<Record<string, string | boolean> | null>(null);
  const cfg = data?.config;
  const f = form ?? {
    etiqueta: cfg?.etiqueta ?? "", titulo_linea1: cfg?.titulo_linea1 ?? "", titulo_linea2: cfg?.titulo_linea2 ?? "",
    titulo_resaltado: cfg?.titulo_resaltado ?? "", subtitulo: cfg?.subtitulo ?? "",
    aviso_activo: cfg?.aviso_activo ?? false, aviso_texto: cfg?.aviso_texto ?? "", aviso_enlace: cfg?.aviso_enlace ?? "",
  };
  const set = (k: string, v: string | boolean) => setForm({ ...f, [k]: v });
  const [guardando, setGuardando] = useState(false);
  const pendiente = form !== null;

  const guardar = async () => {
    setGuardando(true);
    try {
      setData(
        await apiFetch<PortadaAdmin>("/portada/config", {
          method: "PUT",
          body: {
            etiqueta: f.etiqueta || null, titulo_linea1: f.titulo_linea1 || null, titulo_linea2: f.titulo_linea2 || null,
            titulo_resaltado: f.titulo_resaltado || null, subtitulo: f.subtitulo || null,
            aviso_activo: !!f.aviso_activo, aviso_texto: f.aviso_texto || null, aviso_enlace: f.aviso_enlace || null,
          },
        }),
      );
      setForm(null);
      toast("Portada guardada");
      refrescarPortada();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setGuardando(false);
    }
  };

  const barraGuardar = (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Button onClick={guardar} loading={guardando} disabled={!pendiente}>
        Guardar cambios
      </Button>
      {pendiente && (
        <>
          <span className="text-sm text-fg-muted">Tienes cambios sin guardar</span>
          <Button variant="ghost" size="sm" onClick={() => setForm(null)} disabled={guardando}>
            Descartar
          </Button>
        </>
      )}
    </div>
  );

  if (loading && !data) return <Spinner label="Cargando portada" />;
  if (!data) return <Alert tone="red">No pudimos cargar la configuración de la portada.</Alert>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-fg">Portada</h1>
        <p className="text-fg-secondary">Textos, aviso y fotos del inicio del sitio. Lo que quede vacío usa el contenido por defecto.</p>
        <p className="text-sm text-fg-muted">Los cambios se publican en la portada al guardar.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 text-xl font-semibold text-fg">Textos del inicio</h2>
          <div className="space-y-4">
            <Field label="Etiqueta" hint="Déjalo vacío para usar el texto por defecto">{(id) => <Input id={id} value={String(f.etiqueta)} placeholder={DEF.etiqueta} onChange={(e) => set("etiqueta", e.target.value)} />}</Field>
            <Field label="Título, línea 1">{(id) => <Input id={id} value={String(f.titulo_linea1)} placeholder={DEF.titulo_linea1} onChange={(e) => set("titulo_linea1", e.target.value)} />}</Field>
            <Field label="Título, línea 2">{(id) => <Input id={id} value={String(f.titulo_linea2)} placeholder={DEF.titulo_linea2} onChange={(e) => set("titulo_linea2", e.target.value)} />}</Field>
            <Field label="Texto resaltado (ámbar)">{(id) => <Input id={id} value={String(f.titulo_resaltado)} placeholder={DEF.titulo_resaltado} onChange={(e) => set("titulo_resaltado", e.target.value)} />}</Field>
            <Field label="Subtítulo">{(id) => <Textarea id={id} value={String(f.subtitulo)} placeholder={DEF.subtitulo} rows={3} onChange={(e) => set("subtitulo", e.target.value)} />}</Field>
          </div>
          {barraGuardar}
        </Card>
        <div className="h-fit rounded-2xl bg-tinta p-6 text-papel shadow-[0_20px_40px_-18px_rgb(15_27_45/0.3)]">
          <p className="mb-4 text-sm font-semibold text-papel/70">Vista previa</p>
          <p className="inline-flex items-center gap-2 rounded-full bg-papel/15 px-3 py-1 text-xs font-semibold">{String(f.etiqueta) || DEF.etiqueta}</p>
          <p className="mt-4 font-display text-4xl leading-[0.95] tracking-[-0.03em]">
            {String(f.titulo_linea1) || DEF.titulo_linea1}
            <br />
            {String(f.titulo_linea2) || DEF.titulo_linea2} <span className="text-ambar">{String(f.titulo_resaltado) || DEF.titulo_resaltado}</span>
          </p>
          <p className="mt-4 text-sm text-papel/75">{String(f.subtitulo) || DEF.subtitulo}</p>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold text-fg">Aviso destacado</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="flex items-center gap-2.5 text-sm font-semibold text-fg">
              <input type="checkbox" checked={!!f.aviso_activo} onChange={(e) => set("aviso_activo", e.target.checked)} className="h-4 w-4 accent-brand" />
              Mostrar la franja de aviso en la portada
            </label>
            <Field label="Texto del aviso">{(id) => <Input id={id} value={String(f.aviso_texto)} onChange={(e) => set("aviso_texto", e.target.value)} maxLength={200} />}</Field>
            <Field label="Enlace" hint="Ej.: /oportunidades o https://ejemplo.cl">{(id) => <Input id={id} value={String(f.aviso_enlace)} onChange={(e) => set("aviso_enlace", e.target.value)} />}</Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-fg-muted">Vista previa</p>
            {f.aviso_activo && f.aviso_texto ? (
              <p className="flex items-center justify-center gap-3 rounded-xl bg-ambar px-4 py-2.5 text-center text-sm font-semibold text-tinta">
                {String(f.aviso_texto)}
                {!!f.aviso_enlace && <span className="inline-flex items-center gap-1 underline underline-offset-2">Ver más <ArrowRight className="h-3.5 w-3.5" /></span>}
              </p>
            ) : (
              <p className="rounded-xl border border-dashed border-tinta/30 px-4 py-2.5 text-center text-sm text-fg-muted">Sin aviso activo</p>
            )}
          </div>
        </div>
        {barraGuardar}
      </Card>

      <SeccionFotos titulo="Fotos del inicio" seccion="inicio" fotos={data.fotos.inicio} reload={setData} />
      <SeccionFotos titulo="Fotos del carrusel" seccion="galeria" fotos={data.fotos.galeria} reload={setData} />
    </div>
  );
}
