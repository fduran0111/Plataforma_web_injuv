"use client";

import { Download, FileCheck2, FileUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { apiFetch, downloadFile } from "@/lib/api";
import { formatDate, formatRut } from "@/lib/format";
import type { CertificadoPersonal, Usuario } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

const TIPOS: { value: CertificadoPersonal["tipo"]; title: string; description: string }[] = [
  {
    value: "antecedentes",
    title: "Certificado de antecedentes",
    description: "Emitido por el Registro Civil. Algunas organizaciones lo piden al postular.",
  },
  {
    value: "inhabilidades",
    title: "Certificado de inhabilidades",
    description: "Para trabajar con menores de edad. Emitido por el Registro de Inhabilidades.",
  },
];

export default function DocumentosTab({ user }: { user: Usuario }) {
  const { setUser } = useAuth();
  const toast = useToast();
  const [fecha, setFecha] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const cert = (tipo: string) => user.certificados_personales.find((c) => c.tipo === tipo);

  async function subir(tipo: string, file: File | undefined) {
    if (!file) return;
    if (!fecha[tipo]) return toast("Indica primero la fecha de emisión del certificado", "info");
    setBusy(tipo);
    try {
      const body = new FormData();
      body.append("tipo", tipo);
      body.append("fecha_emision", fecha[tipo]);
      body.append("archivo", file);
      const updated = await apiFetch<Usuario>("/usuarios/me/certificados", { method: "POST", body });
      setUser(updated);
      toast("Certificado subido");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
      const input = fileRefs.current[tipo];
      if (input) input.value = "";
    }
  }

  async function eliminar(tipo: string) {
    setBusy(tipo);
    try {
      const updated = await apiFetch<Usuario>(`/usuarios/me/certificados/${tipo}`, { method: "DELETE" });
      setUser(updated);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <Alert tone="blue">
        Estos certificados deben tener <strong>menos de 6 meses de antigüedad</strong>. Las organizaciones pueden verlos cuando revisan tu postulación.
      </Alert>
      <div className="grid gap-5 md:grid-cols-2">
        {TIPOS.map(({ value: tipo, title, description }) => {
          const c = cert(tipo);
          return (
            <Card key={tipo} className="p-6">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2.5 ${c ? "bg-emerald-50 text-emerald-600" : "bg-brand-soft text-brand"}`}>
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-fg">{title}</h3>
                  <p className="mt-1 text-sm text-fg-muted">{description}</p>
                </div>
              </div>
              {c ? (
                <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                  <p className="truncate text-sm font-medium text-fg">{c.nombre_archivo ?? `${tipo}.pdf`}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    Emitido el {formatDate(c.fecha_emision)} · subido el {formatDate(c.subido_en)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => downloadFile(`/usuarios/me/certificados/${tipo}`, `${tipo}.pdf`)}>
                      <Download className="h-4 w-4" /> Descargar
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600" loading={busy === tipo} onClick={() => eliminar(tipo)}>
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <Field label="Fecha de emisión del documento" required>
                    {(id) => <Input id={id} type="date" value={fecha[tipo] ?? ""} onChange={(e) => setFecha((f) => ({ ...f, [tipo]: e.target.value }))} />}
                  </Field>
                  <input
                    ref={(el) => {
                      fileRefs.current[tipo] = el;
                    }}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => subir(tipo, e.target.files?.[0])}
                  />
                  <Button variant="outline" loading={busy === tipo} onClick={() => fileRefs.current[tipo]?.click()}>
                    <FileUp className="h-4 w-4" /> Subir PDF (máx. 10 MB)
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
      <Card className="p-6">
        <h3 className="font-semibold text-fg">Tu RUT</h3>
        <p className="mt-1 text-sm text-fg-muted">{formatRut(user.rut)} — lo usan las organizaciones para emitir tu certificado.</p>
      </Card>
    </div>
  );
}
