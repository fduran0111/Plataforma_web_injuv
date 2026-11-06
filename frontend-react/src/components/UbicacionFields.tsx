"use client";

import { Field, Select } from "@/components/ui";
import { comunasDe, provinciasDe } from "@/lib/chile";
import { REGIONES } from "@/lib/constants";

export type Ubicacion = {
  region: string;
  ciudad: string;
  comuna: string;
};

/** Si el valor guardado no está en el catálogo (datos antiguos o escritos a mano), se muestra igual para no perderlo. */
function opciones(lista: string[], actual: string): string[] {
  return actual && !lista.includes(actual) ? [actual, ...lista] : lista;
}

/**
 * Región → Ciudad (provincia) → Comuna en cascada. Al cambiar la región se limpian ciudad y comuna;
 * al cambiar la ciudad se limpia la comuna.
 */
export default function UbicacionFields({
  region,
  ciudad,
  comuna,
  onChange,
  required,
  className,
}: {
  region: string;
  ciudad: string;
  comuna: string;
  onChange: (patch: Partial<Ubicacion>) => void;
  required?: boolean;
  /** Si se define, envuelve los tres selects (p. ej. "grid gap-4 sm:grid-cols-3 sm:col-span-2"). */
  className?: string;
}) {
  const provincias = provinciasDe(region);
  const comunas = comunasDe(region, ciudad);
  const content = (
    <>
      <Field label="Región" required={required}>
        {(id) => (
          <Select
            id={id}
            required={required}
            value={region}
            onChange={(e) => onChange({ region: e.target.value, ciudad: "", comuna: "" })}
            options={REGIONES}
            placeholder="Selecciona"
          />
        )}
      </Field>
      <Field label="Ciudad" required={required}>
        {(id) => (
          <Select
            id={id}
            required={required}
            value={ciudad}
            disabled={!region}
            onChange={(e) => onChange({ ciudad: e.target.value, comuna: "" })}
            options={opciones(
              provincias.map((p) => p.nombre),
              ciudad,
            )}
            placeholder={region ? "Selecciona" : "Elige la región primero"}
          />
        )}
      </Field>
      <Field label="Comuna" required={required}>
        {(id) => (
          <Select
            id={id}
            required={required}
            value={comuna}
            disabled={!ciudad}
            onChange={(e) => onChange({ comuna: e.target.value })}
            options={opciones(comunas, comuna)}
            placeholder={ciudad ? "Selecciona" : "Elige la ciudad primero"}
          />
        )}
      </Field>
    </>
  );
  return className ? <div className={className}>{content}</div> : content;
}
