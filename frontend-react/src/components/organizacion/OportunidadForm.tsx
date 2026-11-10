"use client";

import { useState } from "react";
import FechasFields, { validarPeriodo } from "@/components/organizacion/FechasFields";
import UbicacionFields from "@/components/UbicacionFields";
import { Alert, Button, Checkbox, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { AREAS_VOLUNTARIADO } from "@/lib/constants";
import type { Oportunidad } from "@/lib/types";

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

type Integrante = { id: number; nombre: string; apellido: string; email: string; telefono: string; rol: "admin" | "miembro" };

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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { data: integrantes } = useApi<Integrante[]>(open ? "/organizaciones/mia/integrantes" : null);
  const [encargados, setEncargados] = useState<number[]>(oportunidad?.encargados_ids ?? []);
  const encargado = integrantes?.find(
    (i) => i.email && i.email.toLowerCase() === form.responsable_email.trim().toLowerCase(),
  );

  /** Marca o desmarca un encargado; el primero que se marca pasa a ser el contacto si aún no hay uno. */
  function toggleEncargado(i: Integrante) {
    const marcado = encargados.includes(i.id);
    setEncargados((prev) => (marcado ? prev.filter((x) => x !== i.id) : [...prev, i.id]));
    if (!marcado && !form.responsable_email.trim()) elegirEncargado(String(i.id));
  }

  /** Al elegir un integrante se copian sus datos; quedan editables por si hay que ajustar algo. */
  function elegirEncargado(idTexto: string) {
    const i = integrantes?.find((x) => String(x.id) === idTexto);
    if (!i) return;
    setForm((f) => ({
      ...f,
      responsable_nombre: i.nombre.slice(0, 50),
      responsable_apellido: i.apellido.slice(0, 50),
      responsable_email: i.email,
      responsable_telefono: i.telefono.slice(0, 30),
    }));
  }

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v: string) => (v ? Number(v) : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errorFechas = validarPeriodo(form);
    if (errorFechas) return setError(errorFechas);
    setError(null);
    setSaving(true);
    try {
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
        responsable_nombre: form.responsable_nombre || null,
        responsable_apellido: form.responsable_apellido || null,
        responsable_email: form.responsable_email || null,
        responsable_email_institucional: form.responsable_email_institucional || null,
        responsable_telefono: form.responsable_telefono || null,
        encargados_ids: encargados,
      };
      const saved = oportunidad
        ? await apiFetch<Oportunidad>(`/oportunidades/${oportunidad.id}`, { method: "PUT", body })
        : await apiFetch<Oportunidad>("/oportunidades", { method: "POST", body });
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
        <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
          <p className="text-sm font-semibold text-fg">Encargados del voluntariado</p>
          <p className="mb-3 mt-0.5 text-xs text-fg-muted">
            Solo los encargados (y el administrador de la organización) pueden editar este voluntariado y gestionar a sus postulantes. El resto del equipo lo verá en modo lectura.
          </p>
          {!integrantes ? (
            <p className="mb-4 text-sm text-fg-muted">Cargando equipo…</p>
          ) : (
            <div className="mb-5 grid gap-2 sm:grid-cols-2">
              {integrantes.map((i) => (
                <Checkbox
                  key={i.id}
                  checked={encargados.includes(i.id)}
                  onChange={() => toggleEncargado(i)}
                  label={
                    <span>
                      {[i.nombre, i.apellido].filter(Boolean).join(" ") || i.email}
                      <span className="text-fg-muted"> · {i.rol === "admin" ? "Administrador" : "Miembro"}</span>
                    </span>
                  }
                />
              ))}
            </div>
          )}
          <p className="mb-4 text-sm font-semibold text-fg">Responsable de la actividad (visible para postulantes)</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contacto del equipo" hint="Elige un integrante y se completan sus datos" className="sm:col-span-2">
              {(id) => (
                <Select
                  id={id}
                  value={encargado ? String(encargado.id) : ""}
                  onChange={(e) => elegirEncargado(e.target.value)}
                  placeholder={integrantes ? (encargado ? undefined : "Selecciona un integrante (o completa a mano)") : "Cargando equipo…"}
                  options={(integrantes ?? []).map((i) => ({
                    value: String(i.id),
                    label: `${[i.nombre, i.apellido].filter(Boolean).join(" ") || i.email} · ${i.rol === "admin" ? "Administrador" : "Miembro"}`,
                  }))}
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
    </Modal>
  );
}
