"use client";

import { ArrowLeft, Building2, CheckCircle2, Clock, FileCheck2, Globe, MailCheck, Plus, Send, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Entrada from "@/components/public/Entrada";
import RequireAuth from "@/components/RequireAuth";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Field, Input, Spinner, Textarea } from "@/components/ui";
import UbicacionFields from "@/components/UbicacionFields";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { formatDate, formatRut } from "@/lib/format";
import type { Solicitud, Usuario } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

const ESTADO_SOLICITUD = {
  pendiente: { icon: Clock, tone: "amber" as const, label: "En revisión" },
  aprobada: { icon: CheckCircle2, tone: "green" as const, label: "Aprobada" },
  rechazada: { icon: XCircle, tone: "red" as const, label: "Rechazada" },
};

const COMO_FUNCIONA = [
  { icon: FileCheck2, text: "Un administrador revisa los datos de la solicitud." },
  { icon: MailCheck, text: "Te avisamos por correo apenas sea aprobada." },
  { icon: Send, text: "Desde tu panel podrás publicar voluntariados y ver postulantes." },
];

function SeccionForm({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-4 inline-flex items-center gap-3 text-sm font-semibold text-fg">
        <span className="h-[3px] w-5 rounded-full bg-ambar" aria-hidden />
        {titulo}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function FormularioSolicitud({ onCreated }: { onCreated: () => void }) {
  const toast = useToast();
  const [form, setForm] = useState({
    nombre: "",
    rut: "",
    fecha_creacion: "",
    region: "",
    ciudad: "",
    comuna: "",
    descripcion: "",
    sitio_web: "",
  });
  const [redes, setRedes] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const completos = [
    form.nombre.trim(),
    form.fecha_creacion,
    form.region,
    form.ciudad.trim(),
    form.comuna.trim(),
    form.descripcion.trim().length >= 20 ? "ok" : "",
    form.rut.trim(),
    form.sitio_web.trim(),
  ].filter(Boolean).length;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await apiFetch("/organizaciones/solicitudes", {
        method: "POST",
        body: {
          ...form,
          rut: form.rut ? form.rut.replace(/[^0-9kK]/g, "") : null,
          sitio_web: form.sitio_web || null,
          redes_sociales: redes.filter((r) => r.trim()),
        },
      });
      toast("¡Solicitud enviada! Un administrador la revisará pronto.");
      onCreated();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-x-10 gap-y-10 lg:grid-cols-[320px_1fr]">
      {/* Guía lateral fija */}
      <Entrada as="aside" className="lg:sticky lg:top-24 lg:self-start">
        <h2 className="font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-[1.05] tracking-[-0.025em] text-fg">
          Registra tu organización
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Cuéntanos quiénes son y qué hacen. Al aprobarse, tu organización queda registrada en la plataforma y puedes abrir convocatorias.
        </p>
        <ul className="mt-8 space-y-5">
          {COMO_FUNCIONA.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-tinta bg-papel" aria-hidden>
                <Icon className="h-4 w-4 text-tinta" />
              </span>
              <span className="pt-1.5 text-sm leading-snug text-fg-secondary">{text}</span>
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-fg-muted">Campos completados</span>
            <span className="font-semibold tabular-nums text-fg">{completos} de 8</span>
          </div>
          <div className="mt-2 h-2 overflow-clip rounded-full bg-papel-strong" role="presentation">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300 ease-[var(--ease-out)]"
              style={{ width: `${Math.round((completos / 8) * 100)}%` }}
            />
          </div>
        </div>
      </Entrada>

      {/* Formulario por secciones */}
      <Entrada retraso={0.08}>
        <Card className="p-6 sm:p-8 lg:p-10">
          <form onSubmit={onSubmit} className="space-y-9">
            {error && <Alert>{error}</Alert>}

            <SeccionForm titulo="Los datos">
              <Field label="Nombre de la organización" required className="sm:col-span-2">
                {(id) => <Input id={id} required maxLength={150} value={form.nombre} onChange={set("nombre")} placeholder="Ej: Fundación Manos por Chile" />}
              </Field>
              <Field label="RUT de la organización" hint="Opcional, se puede completar después">
                {(id) => <Input id={id} placeholder="65.123.456-7" value={form.rut} onChange={(e) => setForm((f) => ({ ...f, rut: formatRut(e.target.value) }))} />}
              </Field>
              <Field label="Fecha de creación" required>
                {(id) => <Input id={id} type="date" required value={form.fecha_creacion} onChange={set("fecha_creacion")} />}
              </Field>
            </SeccionForm>

            <SeccionForm titulo="Dónde están">
              <UbicacionFields
                region={form.region}
                ciudad={form.ciudad}
                comuna={form.comuna}
                onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                required
              />
            </SeccionForm>

            <SeccionForm titulo="Qué hacen y dónde encontrarlos">
              <Field label="¿Qué hace tu organización?" required hint="Mínimo 20 caracteres. Cuéntanos su misión y a quiénes acompañan." className="sm:col-span-2">
                {(id) => <Textarea id={id} required minLength={20} maxLength={5000} value={form.descripcion} onChange={set("descripcion")} placeholder="Somos una organización que trabaja con…" />}
              </Field>
              <Field label="Sitio web" className="sm:col-span-2">
                {(id) => <Input id={id} type="url" placeholder="https://www.tuorganizacion.cl" value={form.sitio_web} onChange={set("sitio_web")} />}
              </Field>
              <div className="sm:col-span-2">
                <p className="mb-2.5 flex items-center gap-1.5 text-sm font-medium text-fg-secondary">
                  <Globe className="h-4 w-4" /> Redes sociales (opcional)
                </p>
                <div className="space-y-2">
                  {redes.map((r, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="https://instagram.com/tuorganizacion"
                        value={r}
                        onChange={(e) => setRedes((rs) => rs.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                      {redes.length > 1 && (
                        <Button type="button" variant="ghost" aria-label="Quitar red" onClick={() => setRedes((rs) => rs.filter((_, j) => j !== i))}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {redes.length < 10 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setRedes((rs) => [...rs, ""])}>
                      <Plus className="h-4 w-4" /> Agregar red
                    </Button>
                  )}
                </div>
              </div>
            </SeccionForm>

            <div className="flex flex-col gap-3 border-t-[1.5px] border-dashed border-tinta/25 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-relaxed text-fg-muted">
                Al enviar aceptas que un administrador revise los datos. La respuesta llega a tu correo registrado.
              </p>
              <Button type="submit" size="lg" loading={saving} className="shrink-0">
                <Send className="h-4 w-4" /> Enviar solicitud
              </Button>
            </div>
          </form>
        </Card>
      </Entrada>
    </div>
  );
}

function Contenido({ user }: { user: Usuario }) {
  const router = useRouter();
  const { data: solicitudes, loading, error, reload } = useApi<Solicitud[]>("/organizaciones/solicitudes/mia");

  if (user.organizacion)
    return (
      <EmptyState
        icon={Building2}
        title={`Ya administras ${user.organizacion.nombre ?? "una organización"}`}
        description="Puedes gestionar tus voluntariados y postulantes desde el panel."
        action={
          <Button onClick={() => router.push("/organizacion")}>Ir al panel de organización</Button>
        }
      />
    );

  if (loading && !solicitudes) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  const pendiente = solicitudes?.find((s) => s.estado === "pendiente");
  const historial = solicitudes?.filter((s) => s.estado !== "pendiente") ?? [];

  return (
    <div className="space-y-10">
      {pendiente ? (
        <Entrada>
          <Card className="overflow-clip p-0">
            <div className="grid sm:grid-cols-[88px_1fr]">
              <div className="flex items-start justify-center bg-ambar p-6 text-tinta max-sm:hidden" aria-hidden>
                <Clock className="h-9 w-9" />
              </div>
              <div className="p-6 sm:p-8">
                <Badge tone="amber">
                  <Clock className="h-3.5 w-3.5" /> Solicitud en revisión
                </Badge>
                <h2 className="mt-3 font-display text-[clamp(1.5rem,1.2rem+1.2vw,2rem)] leading-[1.1] tracking-[-0.02em] text-fg">{pendiente.nombre}</h2>
                <p className="mt-2 text-sm text-fg-muted">
                  Enviada el {formatDate(pendiente.created_at)} · {pendiente.comuna}, {pendiente.region}
                </p>
                <p className="prose-text mt-4 text-sm text-fg-secondary">{pendiente.descripcion}</p>
                <Alert tone="amber" className="mt-5">
                  Un administrador está revisando tu solicitud. Te avisaremos por correo cuando sea aprobada.
                </Alert>
              </div>
            </div>
          </Card>
        </Entrada>
      ) : (
        <FormularioSolicitud onCreated={reload} />
      )}

      {!!historial.length && (
        <div className="space-y-3">
          <h3 className="inline-flex items-center gap-3 text-sm font-semibold text-fg-muted">
            <span className="h-[3px] w-5 rounded-full bg-ambar" aria-hidden />
            Solicitudes anteriores
          </h3>
          {historial.map((s) => {
            const e = ESTADO_SOLICITUD[s.estado];
            return (
              <Card key={s.id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-fg">{s.nombre}</p>
                    <p className="text-xs text-fg-muted">Enviada el {formatDate(s.created_at)}</p>
                  </div>
                  <Badge tone={e.tone}>
                    <e.icon className="h-3.5 w-3.5" /> {e.label}
                  </Badge>
                </div>
                {s.comentario_revision && <p className="mt-3 rounded-lg bg-page p-3 text-sm text-fg-secondary">{s.comentario_revision}</p>}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function SolicitudOrganizacionPage() {
  return (
    <RequireAuth roles={["user", "organizacion"]}>
      {(user) => (
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/perfil"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:-translate-x-1" /> Volver a mi perfil
          </Link>
          <h1 className="mb-2 mt-6 font-display text-[clamp(2rem,1.4rem+2.4vw,3.5rem)] leading-[1.02] tracking-[-0.03em] text-fg">Solicitud de organización</h1>
          <p className="mb-10 max-w-[60ch] text-lg text-fg-muted">Registra una organización para publicar voluntariados en la plataforma.</p>
          <Contenido user={user} />
        </div>
      )}
    </RequireAuth>
  );
}
