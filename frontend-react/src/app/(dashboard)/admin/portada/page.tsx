"use client";

import { ArrowDown, ArrowRight, ArrowUp, Crop, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import RecortarFoto from "@/components/perfil/RecortarFoto";
import { Alert, Button, Card, ConfirmModal, Field, Input, Modal, Spinner, Tabs, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, fileUrl, getStoredToken } from "@/lib/api";
import { ACCESO_DEF } from "@/lib/portada";
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

const SECCIONES = {
  inicio: {
    aspecto: 16 / 9, ancho: 1920, minimo: 1600, miniatura: "aspect-video",
    ayuda: "Recomendado: fotos horizontales; podrás encuadrarlas antes de subirlas (máx. 15 MB el original).",
    titulo: "Encuadra la foto del inicio",
    descripcion: "Se verá de fondo en el bloque principal. En celulares se recorta a lo alto desde el centro.",
  },
  galeria: {
    aspecto: 3 / 2, ancho: 1800, minimo: 1200, miniatura: "aspect-video",
    ayuda: "Recomendado: fotos horizontales; podrás encuadrarlas antes de subirlas (máx. 15 MB el original).",
    titulo: "Encuadra la foto del carrusel",
    descripcion: "Así se verá en el carrusel. En celulares se muestra más vertical, centrada.",
  },
  acceso: {
    aspecto: 1, ancho: 1600, minimo: 1000, miniatura: "aspect-square",
    ayuda: "Se muestra la primera foto visible, al lado del formulario de inicio de sesión y registro (solo en pantallas grandes). Máx. 15 MB el original.",
    titulo: "Encuadra la foto de inicio de sesión y registro",
    descripcion: "Se verá a la derecha del formulario. Según el tamaño de la pantalla se recorta un poco por los bordes, centrada.",
  },
} as const;

type Seccion = keyof typeof SECCIONES;

function SeccionFotos({ titulo, seccion, fotos, reload }: { titulo: string; seccion: Seccion; fotos: PortadaFoto[]; reload: (d: PortadaAdmin) => void }) {
  const cfgSec = SECCIONES[seccion];
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
      <p className="mb-4 text-xs text-fg-muted">{cfgSec.ayuda}</p>
      {!fotos.some((f) => f.activa) && <Alert tone="amber">No hay fotos activas: esta sección se mostrará sin imágenes.</Alert>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fotos.map((f, i) => (
          <div key={f.id} className="relative">
            <div className={`relative ${cfgSec.miniatura} overflow-hidden rounded-xl bg-papel-strong`}>
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
        aspecto={cfgSec.aspecto}
        anchoSalida={cfgSec.ancho}
        anchoMinimo={cfgSec.minimo}
        titulo={recorte?.modo === "editar" ? "Encuadra de nuevo la foto" : cfgSec.titulo}
        descripcion={
          recorte?.sinOriginal
            ? "Esta foto se subió sin original: reencuadrarla puede reducir su calidad."
            : recorte?.modo === "editar"
              ? "Se usa la foto original completa para volver a encuadrar."
              : cfgSec.descripcion
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
        message={`Vas a eliminar esta foto de “${titulo}”. Se borrará también el archivo.`}
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
    acceso_titulo: cfg?.acceso_titulo ?? "", acceso_subtitulo: cfg?.acceso_subtitulo ?? "", acceso_cita: cfg?.acceso_cita ?? "",
  };
  const set = (k: string, v: string | boolean) => setForm({ ...f, [k]: v });
  const [guardando, setGuardando] = useState(false);
  const [vista, setVista] = useState<"portada" | "acceso">("portada");
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
            acceso_titulo: f.acceso_titulo || null, acceso_subtitulo: f.acceso_subtitulo || null, acceso_cita: f.acceso_cita || null,
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
        <h1 className="text-h1 text-fg">Apariencia del sitio</h1>
        <p className="text-fg-secondary">Textos y fotos que ven los visitantes. Los textos vacíos usan el contenido por defecto; las secciones sin fotos se muestran sin imágenes.</p>
        <p className="text-sm text-fg-muted">Los cambios se publican en el sitio al guardar.</p>
      </div>

      <Tabs
        value={vista}
        onChange={setVista}
        tabs={[
          { value: "portada", label: "Portada" },
          { value: "acceso", label: "Inicio de sesión y registro" },
        ]}
      />

      {vista === "acceso" ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="mb-4 text-xl font-semibold text-fg">Textos de los cuadros</h2>
              <div className="space-y-4">
                <Field label="Cuadro azul, título" hint="Déjalo vacío para usar el texto por defecto">
                  {(id) => <Input id={id} value={String(f.acceso_titulo)} placeholder={ACCESO_DEF.titulo} maxLength={80} onChange={(e) => set("acceso_titulo", e.target.value)} />}
                </Field>
                <Field label="Cuadro azul, subtítulo">
                  {(id) => <Input id={id} value={String(f.acceso_subtitulo)} placeholder={ACCESO_DEF.subtitulo} maxLength={120} onChange={(e) => set("acceso_subtitulo", e.target.value)} />}
                </Field>
                <Field label="Cuadro ámbar, frase" hint="Las comillas se agregan solas">
                  {(id) => <Input id={id} value={String(f.acceso_cita)} placeholder={ACCESO_DEF.cita} maxLength={120} onChange={(e) => set("acceso_cita", e.target.value)} />}
                </Field>
              </div>
              {barraGuardar}
            </Card>
            <div className="h-fit">
              <p className="mb-2 text-sm font-semibold text-fg-muted">Vista previa</p>
              <div className="grid grid-cols-5 overflow-hidden rounded-2xl shadow-[0_20px_40px_-18px_rgb(15_27_45/0.3)]">
                <div className="col-span-2 flex flex-col justify-end bg-tinta p-6 text-papel">
                  <p className="font-display text-lg leading-tight">{String(f.acceso_titulo) || ACCESO_DEF.titulo}</p>
                  <p className="mt-2 text-xs text-papel/70">{String(f.acceso_subtitulo) || ACCESO_DEF.subtitulo}</p>
                </div>
                <div className="col-span-3 bg-ambar p-6 text-tinta">
                  <p className="max-w-[24ch] font-display text-2xl leading-[1.12] tracking-[-0.015em]">“{String(f.acceso_cita) || ACCESO_DEF.cita}”</p>
                </div>
              </div>
            </div>
          </div>
          <SeccionFotos titulo="Foto de inicio de sesión y registro" seccion="acceso" fotos={data.fotos.acceso ?? []} reload={setData} />
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
