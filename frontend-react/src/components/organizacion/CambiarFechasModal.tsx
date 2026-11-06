"use client";

import { useState } from "react";
import FechasFields, { type Fechas, validarPeriodo } from "@/components/organizacion/FechasFields";
import { Alert, Button, Field, Modal, Textarea } from "@/components/ui";
import { apiFetch } from "@/lib/api";
import type { Oportunidad } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

const fechasDe = (op: Oportunidad): Fechas => ({
  fecha_limite_postulacion: op.fecha_limite_postulacion ?? "",
  fecha_inicio_voluntariado: op.fecha_inicio_voluntariado ?? "",
  fecha_fin_voluntariado: op.fecha_fin_voluntariado ?? "",
});

/**
 * Modificar o aplazar las fechas de un voluntariado publicado. Montar con `key={op.id}` para que el
 * formulario se reinicie al cambiar de oportunidad.
 */
export default function CambiarFechasModal({
  op,
  onClose,
  onSaved,
}: {
  op: Oportunidad | null;
  onClose: () => void;
  onSaved: (op: Oportunidad) => void;
}) {
  const toast = useToast();
  const [fechas, setFechas] = useState<Fechas>(op ? fechasDe(op) : fechasDe({} as Oportunidad));
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (!op) return null;
  const original = fechasDe(op);
  const cambio = (Object.keys(fechas) as (keyof Fechas)[]).some((k) => fechas[k] !== original[k]);

  /** Mueve las tres fechas la misma cantidad de días (las que existan). */
  const aplazar = (dias: number) =>
    setFechas((f) => {
      const mover = (v: string) => {
        if (!v) return v;
        const d = new Date(`${v}T00:00:00`);
        d.setDate(d.getDate() + dias);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      };
      return {
        fecha_limite_postulacion: mover(f.fecha_limite_postulacion),
        fecha_inicio_voluntariado: mover(f.fecha_inicio_voluntariado),
        fecha_fin_voluntariado: mover(f.fecha_fin_voluntariado),
      };
    });

  async function guardar() {
    const err = validarPeriodo(fechas);
    if (err) return setError(err);
    setError(null);
    setSaving(true);
    try {
      const saved = await apiFetch<Oportunidad>(`/oportunidades/${op!.id}/fechas`, {
        method: "PATCH",
        body: {
          fecha_limite_postulacion: fechas.fecha_limite_postulacion || null,
          fecha_inicio_voluntariado: fechas.fecha_inicio_voluntariado || null,
          fecha_fin_voluntariado: fechas.fecha_fin_voluntariado || null,
          motivo: motivo.trim() || null,
        },
      });
      toast("Fechas actualizadas — se avisará a los postulantes");
      onSaved(saved);
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Cambiar fechas"
      description={op.titulo}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button loading={saving} disabled={!cambio} onClick={guardar}>
            Guardar fechas
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {error && <Alert>{error}</Alert>}
        <div>
          <p className="mb-2 text-sm font-medium text-fg-secondary">Aplazar todo</p>
          <div className="flex flex-wrap gap-2">
            {[
              { dias: 7, label: "+1 semana" },
              { dias: 14, label: "+2 semanas" },
              { dias: 30, label: "+1 mes" },
            ].map(({ dias, label }) => (
              <Button key={dias} size="sm" variant="secondary" onClick={() => aplazar(dias)}>
                {label}
              </Button>
            ))}
            {cambio && (
              <Button size="sm" variant="ghost" onClick={() => setFechas(original)}>
                Deshacer
              </Button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-fg-muted">Mueve las tres fechas la misma cantidad de días. También puedes editarlas una por una.</p>
        </div>
        <FechasFields value={fechas} onChange={(k, v) => setFechas((f) => ({ ...f, [k]: v }))} minHoy />
        <Field label="Motivo del cambio (opcional)" hint="Se incluye en el aviso a los postulantes">
          {(id) => <Textarea id={id} value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} placeholder="Ej: por pronóstico de lluvia se reprograma la jornada" />}
        </Field>
        {op.estado === "cerrada" && (
          <Alert tone="blue">
            La convocatoria está cerrada. Si aplazas el cierre de postulaciones, después puedes reabrirla con el botón “Reabrir”.
          </Alert>
        )}
      </div>
    </Modal>
  );
}
