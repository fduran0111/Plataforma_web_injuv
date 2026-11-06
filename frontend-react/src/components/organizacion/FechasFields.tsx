"use client";

import { Field, Input } from "@/components/ui";

export type Fechas = {
  fecha_limite_postulacion: string;
  fecha_inicio_voluntariado: string;
  fecha_fin_voluntariado: string;
};

/** Hoy en formato YYYY-MM-DD (hora local). */
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mensaje de error si el período es incoherente (mismas reglas que la API). */
export function validarPeriodo(f: Fechas): string | null {
  const { fecha_limite_postulacion: lim, fecha_inicio_voluntariado: ini, fecha_fin_voluntariado: fin } = f;
  if (ini && fin && ini > fin) return "La fecha de término no puede ser anterior a la fecha de inicio";
  if (lim && ini && lim > ini) return "El voluntariado no puede comenzar antes del cierre de postulaciones";
  if (lim && fin && lim > fin) return "El cierre de postulaciones no puede ser posterior al término del voluntariado";
  return null;
}

/** Cierre de postulaciones + período (inicio–término), con límites mínimos encadenados. */
export default function FechasFields({
  value,
  onChange,
  minHoy,
}: {
  value: Fechas;
  onChange: (campo: keyof Fechas, valor: string) => void;
  /** Al crear (o al cambiar fechas), no se permiten fechas pasadas. */
  minHoy?: boolean;
}) {
  const hoy = minHoy ? hoyISO() : undefined;
  const minInicio = value.fecha_limite_postulacion || hoy;
  const minFin = value.fecha_inicio_voluntariado || minInicio;
  const error = validarPeriodo(value);
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Field label="Postulaciones hasta">
        {(id) => (
          <Input
            id={id}
            type="date"
            min={hoy}
            value={value.fecha_limite_postulacion}
            onChange={(e) => onChange("fecha_limite_postulacion", e.target.value)}
          />
        )}
      </Field>
      <Field label="Inicio del voluntariado">
        {(id) => (
          <Input
            id={id}
            type="date"
            min={minInicio}
            value={value.fecha_inicio_voluntariado}
            onChange={(e) => onChange("fecha_inicio_voluntariado", e.target.value)}
          />
        )}
      </Field>
      <Field label="Término del voluntariado" hint="Si dura un solo día, usa la misma fecha de inicio">
        {(id) => (
          <Input
            id={id}
            type="date"
            min={minFin}
            value={value.fecha_fin_voluntariado}
            onChange={(e) => onChange("fecha_fin_voluntariado", e.target.value)}
          />
        )}
      </Field>
      {error && <p className="text-xs text-red-600 sm:col-span-3">{error}</p>}
    </div>
  );
}
