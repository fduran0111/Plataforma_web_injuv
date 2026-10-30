"use client";

import { Building2, CheckCircle2, Clock, Globe, Plus, Trash2, XCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Field, Input, Select, Spinner, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { REGIONES } from "@/lib/constants";
import { formatDate, formatRut } from "@/lib/format";
import type { Solicitud, Usuario } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

const ESTADO_SOLICITUD = {
  pendiente: { icon: Clock, tone: "amber" as const, label: "En revisión" },
  aprobada: { icon: CheckCircle2, tone: "green" as const, label: "Aprobada" },
  rechazada: { icon: XCircle, tone: "red" as const, label: "Rechazada" },
};

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
    <Card className="p-6 sm:p-8">
      <h2 className="text-xl font-bold text-fg">Registra tu organización</h2>
      <p className="mt-1 text-sm text-fg-muted">
        Completa los datos de tu organización. Un administrador revisará la solicitud y, al aprobarla, podrás publicar voluntariados.
      </p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
        {error && <Alert className="sm:col-span-2">{error}</Alert>}
        <Field label="Nombre de la organización" required className="sm:col-span-2">
          {(id) => <Input id={id} required maxLength={150} value={form.nombre} onChange={set("nombre")} />}
        </Field>
        <Field label="RUT de la organización">
          {(id) => <Input id={id} placeholder="65.123.456-7" value={form.rut} onChange={(e) => setForm((f) => ({ ...f, rut: formatRut(e.target.value) }))} />}
        </Field>
        <Field label="Fecha de creación" required>
          {(id) => <Input id={id} type="date" required value={form.fecha_creacion} onChange={set("fecha_creacion")} />}
        </Field>
        <Field label="Región" required>
          {(id) => <Select id={id} required value={form.region} onChange={set("region")} options={REGIONES} placeholder="Selecciona" />}
        </Field>
        <Field label="Ciudad" required>
          {(id) => <Input id={id} required value={form.ciudad} onChange={set("ciudad")} />}
        </Field>
        <Field label="Comuna" required>
          {(id) => <Input id={id} required value={form.comuna} onChange={set("comuna")} />}
        </Field>
        <Field label="Sitio web">
          {(id) => <Input id={id} type="url" placeholder="https://www.tuorganizacion.cl" value={form.sitio_web} onChange={set("sitio_web")} />}
        </Field>
        <Field label="¿Qué hace tu organización?" required hint="Mínimo 20 caracteres" className="sm:col-span-2">
          {(id) => <Textarea id={id} required minLength={20} maxLength={5000} value={form.descripcion} onChange={set("descripcion")} />}
        </Field>
        <div className="sm:col-span-2">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-fg-secondary">
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
                  <Button type="button" variant="ghost" onClick={() => setRedes((rs) => rs.filter((_, j) => j !== i))}>
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
        <div className="sm:col-span-2">
          <Button type="submit" size="lg" loading={saving}>
            Enviar solicitud
          </Button>
        </div>
      </form>
    </Card>
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
    <div className="space-y-6">
      {pendiente ? (
        <Card className="border-amber-200 p-6 sm:p-8">
          <Badge tone="amber">
            <Clock className="h-3.5 w-3.5" /> Solicitud en revisión
          </Badge>
          <h2 className="mt-3 text-xl font-bold text-fg">{pendiente.nombre}</h2>
          <p className="mt-2 text-sm text-fg-muted">
            Enviada el {formatDate(pendiente.created_at)} · {pendiente.comuna}, {pendiente.region}
          </p>
          <p className="prose-text mt-4 text-sm text-fg-secondary">{pendiente.descripcion}</p>
          <Alert tone="amber" className="mt-5">
            Un administrador está revisando tu solicitud. Te avisaremos por correo cuando sea aprobada.
          </Alert>
        </Card>
      ) : (
        <FormularioSolicitud onCreated={reload} />
      )}

      {!!historial.length && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-fg-muted">Solicitudes anteriores</h3>
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
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
          <Link href="/perfil" className="text-sm font-medium text-fg-muted hover:text-fg">
            ← Volver a mi perfil
          </Link>
          <h1 className="mb-2 mt-4 text-3xl font-bold tracking-tight text-fg">Solicitud de organización</h1>
          <p className="mb-8 text-fg-muted">Registra una organización para publicar voluntariados en la plataforma.</p>
          <Contenido user={user} />
        </div>
      )}
    </RequireAuth>
  );
}
