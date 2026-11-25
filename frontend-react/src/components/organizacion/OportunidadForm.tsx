"use client";

import { Mail, Plus, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import FechasFields, { validarPeriodo } from "@/components/organizacion/FechasFields";
import RecortarFoto from "@/components/perfil/RecortarFoto";
import UbicacionFields, { type Ubicacion } from "@/components/UbicacionFields";
import { Alert, Badge, Button, Checkbox, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, fileUrl } from "@/lib/api";
import { AREAS_VOLUNTARIADO } from "@/lib/constants";
import type { Oportunidad, TipoPregunta } from "@/lib/types";

type FormState = {
  titulo: string;
  descripcion: string;
  tipo_de_voluntariado: string;
  meta_postulantes: string;
  cupo_maximo: string;
  horas_voluntariado: string;
  fecha_limite_postulacion: string;
  fecha_inicio_voluntariado: string;
  fecha_fin_voluntariado: string;
  region: string;
  ciudad: string;
  comuna: string;
  responsable_nombre: string;
  responsable_apellido: string;
  responsable_email: string;
  responsable_email_institucional: string;
  responsable_telefono: string;
};

const EMPTY: FormState = {
  titulo: "",
  descripcion: "",
  tipo_de_voluntariado: "",
  meta_postulantes: "",
  cupo_maximo: "",
  horas_voluntariado: "",
  fecha_limite_postulacion: "",
  fecha_inicio_voluntariado: "",
  fecha_fin_voluntariado: "",
  region: "",
  ciudad: "",
  comuna: "",
  responsable_nombre: "",
  responsable_apellido: "",
  responsable_email: "",
  responsable_email_institucional: "",
  responsable_telefono: "",
};

/** Pregunta en edición: `opciones` puede tener casillas vacías hasta que se guarda. */
type PreguntaForm = { id?: string; texto: string; tipo: TipoPregunta; opciones: string[]; multiple: boolean; obligatoria: boolean };

const MAX_OPCIONES = 10;
const opcionesLimpias = (q: PreguntaForm) => [...new Set(q.opciones.map((o) => o.trim()).filter(Boolean))];

const PREGUNTA_TIPOS = [
  { value: "si_no", label: "Sí / No" },
  { value: "alternativas", label: "Alternativas" },
  { value: "texto", label: "Texto libre" },
];

function fromOportunidad(op: Oportunidad): FormState {
  return {
    titulo: op.titulo,
    descripcion: op.descripcion,
    tipo_de_voluntariado: op.tipo_de_voluntariado,
    meta_postulantes: op.meta_postulantes?.toString() ?? "",
    cupo_maximo: op.cupo_maximo?.toString() ?? "",
    horas_voluntariado: op.horas_voluntariado?.toString() ?? "",
    fecha_limite_postulacion: op.fecha_limite_postulacion ?? "",
    fecha_inicio_voluntariado: op.fecha_inicio_voluntariado ?? "",
    fecha_fin_voluntariado: op.fecha_fin_voluntariado ?? "",
    region: op.region,
    ciudad: op.ciudad,
    comuna: op.comuna,
    responsable_nombre: op.responsable_nombre,
    responsable_apellido: op.responsable_apellido,
    responsable_email: op.responsable_email,
    responsable_email_institucional: op.responsable_email_institucional,
    responsable_telefono: op.responsable_telefono,
  };
}

const preguntasDe = (op: Oportunidad): PreguntaForm[] =>
  (op.preguntas ?? []).map((q) => ({
    id: q.id,
    texto: q.texto,
    tipo: q.tipo,
    opciones: q.tipo === "alternativas" ? [...q.opciones] : [],
    multiple: !!q.multiple,
    obligatoria: q.obligatoria,
  }));

const ubicacionesExtraDe = (op: Oportunidad): Ubicacion[] => (op.ubicaciones ?? []).slice(1).map((u) => ({ ...u }));

type Integrante = { id: number; nombre: string; apellido: string; email: string; telefono: string; rol: "admin" | "miembro" };
type CuentaEncontrada = { id: number; nombre: string | null; apellido: string | null; email: string };
type EncargadoApi = { id: number; nombre: string; apellido: string; email: string; miembro: boolean };
/** Encargado o contacto posible; `rol: "externo"` = cuenta que no pertenece a la organización. */
type Persona = { id: number; nombre: string; apellido: string; email: string; telefono: string; rol: "admin" | "miembro" | "externo" };

const nombreDe = (p: Persona) => [p.nombre, p.apellido].filter(Boolean).join(" ") || p.email;
const ROL_LABEL: Record<Persona["rol"], string> = { admin: "Administrador", miembro: "Miembro", externo: "Externo" };

export default function OportunidadForm({
  open,
  onClose,
  oportunidad,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  oportunidad: Oportunidad | null;
  onSaved: (op: Oportunidad) => void;
}) {
  const [form, setForm] = useState<FormState>(oportunidad ? fromOportunidad(oportunidad) : EMPTY);
  const [extras, setExtras] = useState<Ubicacion[]>(oportunidad ? ubicacionesExtraDe(oportunidad) : []);
  const [preguntas, setPreguntas] = useState<PreguntaForm[]>(oportunidad ? preguntasDe(oportunidad) : []);
  const [imagen, setImagen] = useState<File | null>(null);
  const [imagenOriginal, setImagenOriginal] = useState<File | null>(null);
  const [recortando, setRecortando] = useState<File | null>(null);
  const [quitarImagen, setQuitarImagen] = useState(false);
  const imagenRef = useRef<HTMLInputElement>(null);
  const previewImagen = useMemo(() => (imagen ? URL.createObjectURL(imagen) : null), [imagen]);
  useEffect(() => () => { if (previewImagen) URL.revokeObjectURL(previewImagen); }, [previewImagen]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: integrantes } = useApi<Integrante[]>(open ? "/organizaciones/mia/integrantes" : null);
  const { data: encargadosGuardados } = useApi<EncargadoApi[]>(open && oportunidad ? `/oportunidades/${oportunidad.id}/encargados` : null);
  const [encargados, setEncargados] = useState<number[]>(oportunidad?.encargados_ids ?? []);
  const [buscados, setBuscados] = useState<Persona[]>([]);
  const [correoEncargado, setCorreoEncargado] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [errorEncargado, setErrorEncargado] = useState<string | null>(null);

  /** Personas conocidas por id: integrantes (con teléfono), encargados ya guardados y cuentas buscadas por correo. */
  const personas = new Map<number, Persona>();
  for (const p of [...buscados, ...(encargadosGuardados ?? []).map((e) => ({ ...e, telefono: "", rol: "externo" as const }))]) {
    personas.set(p.id, p);
  }
  for (const i of integrantes ?? []) personas.set(i.id, i);
  const listaEncargados = encargados.map((id) => personas.get(id)).filter((p): p is Persona => !!p);
  const contactos = [...(integrantes ?? []), ...listaEncargados.filter((p) => p.rol === "externo")];
  const encargado = contactos.find(
    (p) => p.email && p.email.toLowerCase() === form.responsable_email.trim().toLowerCase(),
  );

  /** Busca la cuenta por correo (igual que en la app) y la agrega como encargado. */
  async function agregarEncargado() {
    const email = correoEncargado.trim();
    if (!email || buscando) return;
    setBuscando(true);
    setErrorEncargado(null);
    try {
      const c = await apiFetch<CuentaEncontrada>(`/usuarios/buscar?email=${encodeURIComponent(email)}`);
      if (encargados.includes(c.id)) {
        setErrorEncargado("Esa cuenta ya es encargada de este voluntariado");
        return;
      }
      const persona: Persona = personas.get(c.id) ?? {
        id: c.id,
        nombre: (c.nombre ?? "").trim(),
        apellido: (c.apellido ?? "").trim(),
        email: c.email,
        telefono: "",
        rol: "externo",
      };
      setBuscados((prev) => [...prev.filter((p) => p.id !== c.id), persona]);
      setEncargados((prev) => [...prev, c.id]);
      setCorreoEncargado("");
      if (!form.responsable_email.trim()) elegirContacto(persona);
    } catch (err) {
      setErrorEncargado((err as Error).message);
    } finally {
      setBuscando(false);
    }
  }

  /** Al elegir un contacto se copian sus datos; quedan editables por si hay que ajustar algo. */
  function elegirContacto(p: Persona | undefined) {
    if (!p) return;
    setForm((f) => ({
      ...f,
      responsable_nombre: p.nombre.slice(0, 50),
      responsable_apellido: p.apellido.slice(0, 50),
      responsable_email: p.email,
      responsable_telefono: p.telefono.slice(0, 30),
    }));
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPregunta = (i: number, patch: Partial<PreguntaForm>) =>
    setPreguntas((prev) => prev.map((q, j) => (j === i ? { ...q, ...patch } : q)));
  const num = (v: string) => (v ? Number(v) : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errorFechas = validarPeriodo(form);
    if (errorFechas) return setError(errorFechas);
    const pregIncompleta = preguntas.find((q) => !q.texto.trim());
    if (pregIncompleta) return setError("Hay una pregunta sin texto. Complétala o quítala.");
    const sinOpciones = preguntas.find((q) => q.tipo === "alternativas" && opcionesLimpias(q).length < 2);
    if (sinOpciones) return setError(`La pregunta "${sinOpciones.texto}" necesita al menos 2 alternativas distintas.`);
    setError(null);
    setSaving(true);
    try {
      // La ubicación principal va primera en la lista; el backend la copia a los campos clásicos.
      const ubicaciones = [{ region: form.region, ciudad: form.ciudad, comuna: form.comuna }, ...extras].filter((u) => u.region);
      const body = {
        ...form,
        tipo_de_voluntariado: form.tipo_de_voluntariado || null,
        meta_postulantes: num(form.meta_postulantes),
        cupo_maximo: num(form.cupo_maximo),
        horas_voluntariado: num(form.horas_voluntariado),
        fecha_limite_postulacion: form.fecha_limite_postulacion || null,
        fecha_inicio_voluntariado: form.fecha_inicio_voluntariado || null,
        fecha_fin_voluntariado: form.fecha_fin_voluntariado || null,
        region: form.region || null,
        ciudad: form.ciudad || null,
        comuna: form.comuna || null,
        ubicaciones,
        preguntas: preguntas.map((q) => ({
          id: q.id,
          texto: q.texto.trim(),
          tipo: q.tipo,
          opciones: q.tipo === "alternativas" ? opcionesLimpias(q) : [],
          multiple: q.tipo === "alternativas" && q.multiple,
          obligatoria: q.obligatoria,
        })),
        responsable_nombre: form.responsable_nombre || null,
        responsable_apellido: form.responsable_apellido || null,
        responsable_email: form.responsable_email || null,
        responsable_email_institucional: form.responsable_email_institucional || null,
        responsable_telefono: form.responsable_telefono || null,
        // Si una cuenta encargada se eliminó ya no aparece en la lista y se descarta al guardar.
        encargados_ids: !oportunidad || encargadosGuardados ? listaEncargados.map((p) => p.id) : encargados,
      };
      const saved = oportunidad
        ? await apiFetch<Oportunidad>(`/oportunidades/${oportunidad.id}`, { method: "PUT", body })
        : await apiFetch<Oportunidad>("/oportunidades", { method: "POST", body });
      // La imagen se sube o se quita después de guardar el voluntariado.
      if (imagen) {
        const data = new FormData();
        data.append("imagen", imagen);
        await apiFetch(`/oportunidades/${saved.id}/imagen`, { method: "PUT", body: data });
        saved.tiene_imagen = true;
      } else if (quitarImagen && oportunidad?.tiene_imagen) {
        await apiFetch(`/oportunidades/${saved.id}/imagen`, { method: "DELETE" });
        saved.tiene_imagen = false;
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={oportunidad ? "Editar voluntariado" : "Publicar voluntariado"}
      description="Los campos con * son obligatorios."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} loading={saving}>
            {oportunidad ? "Guardar cambios" : "Publicar"}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} id="oportunidad-form" className="grid gap-4 sm:grid-cols-2">
        {error && <Alert className="sm:col-span-2">{error}</Alert>}
        <Field label="Título" required className="sm:col-span-2">
          {(id) => <Input id={id} required minLength={3} maxLength={200} value={form.titulo} onChange={set("titulo")} placeholder="Ej: Apoyo escolar en comuna de Pedro Aguirre Cerda" />}
        </Field>
        <Field label="Descripción" required hint="10 a 500 caracteres" className="sm:col-span-2">
          {(id) => <Textarea id={id} required minLength={10} maxLength={500} value={form.descripcion} onChange={set("descripcion")} />}
        </Field>
        <Field label="Área de voluntariado">
          {(id) => <Select id={id} value={form.tipo_de_voluntariado} onChange={set("tipo_de_voluntariado")} options={AREAS_VOLUNTARIADO} placeholder="Selecciona" />}
        </Field>
        <Field label="Horas estimadas">
          {(id) => <Input id={id} type="number" min={0} value={form.horas_voluntariado} onChange={set("horas_voluntariado")} />}
        </Field>
        <Field label="Cupos máximos" hint="Deja vacío para cupo abierto">
          {(id) => <Input id={id} type="number" min={1} value={form.cupo_maximo} onChange={set("cupo_maximo")} />}
        </Field>
        <Field label="Meta de postulantes" hint="Al alcanzarla se cierra la convocatoria">
          {(id) => <Input id={id} type="number" min={1} value={form.meta_postulantes} onChange={set("meta_postulantes")} />}
        </Field>
        <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
          <p className="text-sm font-semibold text-fg">Imagen de la convocatoria (opcional)</p>
          <p className="mb-3 mt-0.5 text-xs text-fg-muted">Se muestra como banner en la página del voluntariado. Al elegirla podrás encuadrarla en formato horizontal 16:9.</p>
          {(oportunidad?.tiene_imagen && !quitarImagen && !imagen) && (
            <div className="mb-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen de la API */}
              <img src={fileUrl.oportunidad(oportunidad.id)} alt="Imagen actual de la convocatoria" className="h-16 w-28 rounded-lg object-cover" />
              <Button type="button" variant="ghost" size="sm" onClick={() => setQuitarImagen(true)}>
                <Trash2 className="h-4 w-4" /> Quitar
              </Button>
            </div>
          )}
          <input
            ref={imagenRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) {
                setImagenOriginal(f);
                setRecortando(f);
              }
            }}
            className="block w-full text-sm text-fg-secondary file:mr-4 file:rounded-lg file:border-0 file:bg-brand-soft file:px-4 file:py-2 file:text-sm file:font-semibold file:text-brand"
          />
          {imagen && previewImagen && (
            <div className="mt-3 flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local del recorte */}
              <img src={previewImagen} alt="Vista previa del encuadre" className="aspect-video w-32 rounded-lg object-cover ring-1 ring-tinta/10" />
              <div className="flex flex-col items-start gap-1">
                <p className="text-xs text-fg-muted">Se subirá al guardar: {imagen.name}</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => setRecortando(imagenOriginal ?? imagen)}>
                  Volver a encuadrar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setImagen(null);
                    setImagenOriginal(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Quitar
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
          <p className="text-sm font-semibold text-fg">Período del voluntariado</p>
          <p className="mb-4 mt-0.5 text-xs text-fg-muted">
            {oportunidad
              ? "Para aplazar o mover fechas de un voluntariado ya publicado también puedes usar “Cambiar fechas”: avisa a los postulantes."
              : "Las postulaciones deben cerrar antes de que empiece el voluntariado."}
          </p>
          <FechasFields
            value={form}
            onChange={(k, v) => setForm((f) => ({ ...f, [k]: v }))}
            minHoy={!oportunidad}
          />
        </div>
        <UbicacionFields
          region={form.region}
          ciudad={form.ciudad}
          comuna={form.comuna}
          onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
        />
        <div className="sm:col-span-2">
          <p className="mb-1 mt-1 text-xs text-fg-muted">
            ¿El voluntariado se realiza en más de una comuna o región? Agrégalas aquí (la de arriba es la principal).
          </p>
          {extras.map((u, i) => (
            <div key={i} className="mb-2 flex items-end gap-2 rounded-xl border border-border/70 p-3">
              <UbicacionFields
                region={u.region}
                ciudad={u.ciudad}
                comuna={u.comuna}
                onChange={(patch) => setExtras((prev) => prev.map((x, j) => (j === i ? { ...x, ...patch } : x)))}
                className="grid flex-1 gap-4 sm:grid-cols-3"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Quitar ubicación"
                onClick={() => setExtras((prev) => prev.filter((_, j) => j !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExtras((prev) => [...prev, { region: "", ciudad: "", comuna: "" }])}
          >
            <Plus className="h-4 w-4" /> Agregar otra ubicación
          </Button>
        </div>
        <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
          <p className="text-sm font-semibold text-fg">Preguntas para postulantes</p>
          <p className="mb-3 mt-0.5 text-xs text-fg-muted">
            Quienes postulen las responden antes de enviar su postulación. Las respuestas solo las ve tu organización y sirven para filtrar postulantes.
          </p>
          {preguntas.map((q, i) => (
            <div key={i} className="mb-2 space-y-3 rounded-xl border border-border/70 p-3">
              <div className="flex items-start gap-2">
                <Input
                  aria-label={`Pregunta ${i + 1}`}
                  required
                  minLength={3}
                  maxLength={300}
                  value={q.texto}
                  onChange={(e) => setPregunta(i, { texto: e.target.value })}
                  placeholder={`Pregunta ${i + 1}: ej. ¿Cuentas con movilización propia?`}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Quitar pregunta"
                  onClick={() => setPreguntas((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[12rem_1fr] sm:items-end">
                <Field label="Tipo de respuesta">
                  {(id) => (
                    <Select
                      id={id}
                      value={q.tipo}
                      onChange={(e) => {
                        const tipo = e.target.value as TipoPregunta;
                        // Al pasar a alternativas se abren dos casillas para empezar a escribir.
                        setPregunta(i, { tipo, opciones: tipo === "alternativas" && !q.opciones.length ? ["", ""] : q.opciones });
                      }}
                      options={PREGUNTA_TIPOS}
                    />
                  )}
                </Field>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pb-2.5">
                  <Checkbox checked={q.obligatoria} onChange={(e) => setPregunta(i, { obligatoria: e.target.checked })} label="Obligatoria" />
                  {q.tipo === "alternativas" && (
                    <Checkbox
                      checked={q.multiple}
                      onChange={(e) => setPregunta(i, { multiple: e.target.checked })}
                      label="Permitir elegir varias"
                    />
                  )}
                </div>
              </div>
              {q.tipo === "alternativas" && (
                <AlternativasEditor
                  numeroPregunta={i + 1}
                  multiple={q.multiple}
                  opciones={q.opciones}
                  onChange={(opciones) => setPregunta(i, { opciones })}
                />
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={preguntas.length >= 10}
            onClick={() => setPreguntas((prev) => [...prev, { texto: "", tipo: "si_no", opciones: [], multiple: false, obligatoria: true }])}
          >
            <Plus className="h-4 w-4" /> Agregar pregunta
          </Button>
        </div>
        <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
          <p className="text-sm font-semibold text-fg">Encargados del voluntariado</p>
          <p className="mb-3 mt-0.5 text-xs text-fg-muted">
            Solo los encargados (y el administrador de la organización) pueden editar este voluntariado y gestionar a sus postulantes. El resto del equipo lo verá en modo lectura.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted" aria-hidden />
              <Input
                type="email"
                aria-label="Correo del encargado"
                placeholder="encargado@correo.cl"
                className="pl-9"
                value={correoEncargado}
                onChange={(e) => {
                  setCorreoEncargado(e.target.value);
                  setErrorEncargado(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    agregarEncargado();
                  }
                }}
              />
            </div>
            <Button type="button" variant="outline" onClick={agregarEncargado} loading={buscando} disabled={!correoEncargado.trim()}>
              <Search className="h-4 w-4" /> Agregar
            </Button>
          </div>
          {errorEncargado && <p className="mt-1.5 text-xs text-red-700">{errorEncargado}</p>}
          <p className="mt-1.5 text-xs text-fg-muted">
            Puede ser cualquier cuenta registrada. Si no pertenece a la organización queda como encargado externo: conserva sus permisos de voluntario y no puede editar el voluntariado.
          </p>
          <p className="mb-2 mt-4 text-xs font-semibold text-fg-secondary">
            {encargados.length === 1 ? "1 encargado" : `${encargados.length} encargados`}
          </p>
          {oportunidad && !encargadosGuardados && encargados.length > 0 ? (
            <p className="mb-5 text-sm text-fg-muted">Cargando encargados…</p>
          ) : (
            <ul className="mb-5 grid gap-2 sm:grid-cols-2">
              {listaEncargados.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-fg">{nombreDe(p)}</p>
                    <p className="truncate text-xs text-fg-muted">{p.email}</p>
                  </div>
                  <Badge tone={p.rol === "externo" ? "amber" : "green"}>{ROL_LABEL[p.rol]}</Badge>
                  <button
                    type="button"
                    onClick={() => setEncargados((prev) => prev.filter((x) => x !== p.id))}
                    className="rounded-sm p-1 text-fg-muted hover:text-fg"
                    aria-label={`Quitar a ${nombreDe(p)}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <p className="mb-4 text-sm font-semibold text-fg">Responsable de la actividad (visible para postulantes)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contacto" hint="Elige un integrante o encargado y se completan sus datos" className="sm:col-span-2">
              {(id) => (
                <Select
                  id={id}
                  value={encargado ? String(encargado.id) : ""}
                  onChange={(e) => elegirContacto(contactos.find((p) => String(p.id) === e.target.value))}
                  placeholder={integrantes ? (encargado ? undefined : "Selecciona una persona (o completa a mano)") : "Cargando equipo…"}
                  options={contactos.map((p) => ({ value: String(p.id), label: `${nombreDe(p)} · ${ROL_LABEL[p.rol]}` }))}
                />
              )}
            </Field>
            <Field label="Nombre">
              {(id) => <Input id={id} maxLength={50} value={form.responsable_nombre} onChange={set("responsable_nombre")} />}
            </Field>
            <Field label="Apellido">
              {(id) => <Input id={id} maxLength={50} value={form.responsable_apellido} onChange={set("responsable_apellido")} />}
            </Field>
            <Field label="Correo institucional">
              {(id) => <Input id={id} type="email" value={form.responsable_email_institucional} onChange={set("responsable_email_institucional")} />}
            </Field>
            <Field label="Correo personal">
              {(id) => <Input id={id} type="email" value={form.responsable_email} onChange={set("responsable_email")} />}
            </Field>
            <Field label="Teléfono">
              {(id) => <Input id={id} type="tel" maxLength={30} value={form.responsable_telefono} onChange={set("responsable_telefono")} />}
            </Field>
          </div>
        </div>
      </form>
      <RecortarFoto
        file={recortando}
        titulo="Encuadra la imagen del voluntariado"
        descripcion="Así se verá en el listado y en la página del voluntariado. Arrastra para moverla y usa el control para acercar o alejar."
        aspecto={16 / 9}
        mascara="rect"
        anchoSalida={1280}
        anchoMinimo={640}
        onCancel={() => setRecortando(null)}
        onConfirm={(recorte) => {
          setImagen(recorte);
          setQuitarImagen(false);
          setRecortando(null);
        }}
      />
    </Modal>
  );
}

/** Lista editable de alternativas: una casilla por opción; Enter agrega la siguiente. */
function AlternativasEditor({
  numeroPregunta,
  opciones,
  multiple,
  onChange,
}: {
  numeroPregunta: number;
  opciones: string[];
  multiple: boolean;
  onChange: (opciones: string[]) => void;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const enfocar = useRef<number | null>(null);
  const filas = opciones.length ? opciones : ["", ""];
  const repetidas = new Set(filas.map((o) => o.trim().toLowerCase()).filter((o, i, a) => o && a.indexOf(o) !== i));

  useEffect(() => {
    if (enfocar.current === null) return;
    refs.current[enfocar.current]?.focus();
    enfocar.current = null;
  });

  const agregar = (despues: number) => {
    if (filas[despues + 1] === "") return refs.current[despues + 1]?.focus();
    if (filas.length >= MAX_OPCIONES) return;
    enfocar.current = despues + 1;
    onChange([...filas.slice(0, despues + 1), "", ...filas.slice(despues + 1)]);
  };
  const quitar = (i: number) => {
    enfocar.current = Math.max(0, i - 1);
    onChange(filas.filter((_, j) => j !== i));
  };

  return (
    <fieldset className="space-y-2">
      <legend className="mb-1.5 text-sm font-medium text-fg">
        Alternativas{" "}
        <span className="font-normal text-fg-muted">
          · el postulante elige {multiple ? "una o varias" : "solo una"}
        </span>
      </legend>
      {filas.map((op, i) => {
        const repetida = repetidas.has(op.trim().toLowerCase());
        return (
          <div key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-3 w-3 shrink-0 border-[1.5px] border-dashed border-tinta/30 ${multiple ? "rounded-[3px]" : "rounded-full"}`}
            />
            <Input
              ref={(el) => {
                refs.current[i] = el;
              }}
              aria-label={`Pregunta ${numeroPregunta}, alternativa ${i + 1}`}
              aria-invalid={repetida || undefined}
              maxLength={100}
              value={op}
              placeholder={i === 0 ? "Ej: Mañana" : i === 1 ? "Ej: Tarde" : `Alternativa ${i + 1}`}
              onChange={(e) => onChange(filas.map((o, j) => (j === i ? e.target.value : o)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  agregar(i);
                } else if (e.key === "Backspace" && !op && filas.length > 2) {
                  e.preventDefault();
                  quitar(i);
                }
              }}
              className={`h-10 flex-1 ${repetida ? "border-brand-red" : ""}`}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Quitar alternativa ${i + 1}`}
              disabled={filas.length <= 2}
              onClick={() => quitar(i)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-6">
        <Button type="button" variant="ghost" size="sm" disabled={filas.length >= MAX_OPCIONES} onClick={() => agregar(filas.length - 1)}>
          <Plus className="h-4 w-4" /> Agregar alternativa
        </Button>
        <span className="text-xs text-fg-muted">
          {repetidas.size ? (
            <span className="text-brand-red">Hay alternativas repetidas: se guardará solo una.</span>
          ) : filas.length >= MAX_OPCIONES ? (
            `Máximo ${MAX_OPCIONES} alternativas.`
          ) : (
            "Enter agrega otra casilla."
          )}
        </span>
      </div>
    </fieldset>
  );
}
