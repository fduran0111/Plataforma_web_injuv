"use client";

import { useState } from "react";
import { Alert, Button, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import { AREAS_VOLUNTARIADO, REGIONES } from "@/lib/constants";
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

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const num = (v: string) => (v ? Number(v) : null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        <Field label="Postulaciones hasta">
          {(id) => <Input id={id} type="date" value={form.fecha_limite_postulacion} onChange={set("fecha_limite_postulacion")} />}
        </Field>
        <Field label="Fecha de inicio">
          {(id) => <Input id={id} type="date" value={form.fecha_inicio_voluntariado} onChange={set("fecha_inicio_voluntariado")} />}
        </Field>
        <Field label="Fecha de término">
          {(id) => <Input id={id} type="date" value={form.fecha_fin_voluntariado} onChange={set("fecha_fin_voluntariado")} />}
        </Field>
        <Field label="Región">
          {(id) => <Select id={id} value={form.region} onChange={set("region")} options={REGIONES} placeholder="Selecciona" />}
        </Field>
        <Field label="Ciudad">
          {(id) => <Input id={id} value={form.ciudad} onChange={set("ciudad")} />}
        </Field>
        <Field label="Comuna">
          {(id) => <Input id={id} value={form.comuna} onChange={set("comuna")} />}
        </Field>
        <div className="sm:col-span-2 mt-2 border-t border-border pt-4">
          <p className="mb-4 text-sm font-semibold text-fg">Responsable de la actividad (visible para postulantes)</p>
          <div className="grid gap-4 sm:grid-cols-2">
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
