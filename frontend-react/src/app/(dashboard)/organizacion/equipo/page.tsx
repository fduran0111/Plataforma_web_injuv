"use client";

import { ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { useState } from "react";
import { Alert, Avatar, Badge, Button, Card, ErrorState, Field, Input, PageHeader, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, fileUrl } from "@/lib/api";
import { useToast } from "@/providers/ToastProvider";

type Integrante = { id: number; nombre: string; email: string; tiene_foto: boolean; foto_version: string | null };
type Equipo = { admin: Integrante | null; miembros: Integrante[] };

function Fila({ p, accion }: { p: Integrante; accion?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <Avatar name={p.nombre} src={p.tiene_foto ? fileUrl.foto(p.id, p.foto_version) : null} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-fg">{p.nombre || p.email}</p>
        <p className="truncate text-xs text-fg-muted">{p.email}</p>
      </div>
      {accion}
    </div>
  );
}

export default function EquipoPage() {
  const { data, loading, error, reload } = useApi<Equipo>("/organizaciones/mia/miembros");
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [quitando, setQuitando] = useState<number | null>(null);

  async function agregar(e: React.FormEvent) {
    e.preventDefault();
    setErrorForm(null);
    setAgregando(true);
    try {
      await apiFetch("/organizaciones/mia/miembros", { method: "POST", body: { email: email.trim() } });
      toast("Miembro agregado");
      setEmail("");
      reload();
    } catch (err) {
      setErrorForm((err as Error).message);
    } finally {
      setAgregando(false);
    }
  }

  async function quitar(p: Integrante) {
    if (!confirm(`¿Quitar a ${p.nombre || p.email} de la organización?`)) return;
    setQuitando(p.id);
    try {
      await apiFetch(`/organizaciones/mia/miembros/${p.id}`, { method: "DELETE" });
      toast("Miembro quitado");
      reload();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setQuitando(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Equipo"
        description="Agrega miembros a tu organización. Los miembros gestionan los voluntariados (publicar, editar, postulantes, certificados) y la academia, pero no pueden modificar el perfil de la organización, las reseñas ni el equipo."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="p-6">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <Users className="h-5 w-5 text-fg-muted" /> Integrantes
          </h2>
          {error && <ErrorState message={error} onRetry={reload} />}
          {loading && !data && <Spinner />}
          {data && (
            <div className="mt-2 divide-y divide-border">
              {data.admin && (
                <Fila
                  p={data.admin}
                  accion={
                    <Badge tone="blue">
                      <ShieldCheck className="h-3.5 w-3.5" /> Administrador
                    </Badge>
                  }
                />
              )}
              {data.miembros.map((m) => (
                <Fila
                  key={m.id}
                  p={m}
                  accion={
                    <div className="flex items-center gap-2">
                      <Badge tone="slate">Miembro</Badge>
                      <Button size="sm" variant="ghost" className="text-red-600" loading={quitando === m.id} onClick={() => quitar(m)} aria-label="Quitar miembro">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  }
                />
              ))}
              {!data.miembros.length && <p className="py-3 text-sm text-fg-muted">Aún no hay miembros. Agrega el primero con su correo.</p>}
            </div>
          )}
        </Card>

        <Card className="h-fit p-6">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <UserPlus className="h-5 w-5 text-fg-muted" /> Agregar miembro
          </h2>
          <p className="mt-1 text-sm text-fg-muted">La persona debe tener una cuenta creada en la plataforma. Al agregarla verá el panel de la organización la próxima vez que inicie sesión.</p>
          <form onSubmit={agregar} className="mt-4 space-y-3">
            {errorForm && <Alert>{errorForm}</Alert>}
            <Field label="Correo de la cuenta" required>
              {(id) => <Input id={id} type="email" required placeholder="persona@correo.cl" value={email} onChange={(e) => setEmail(e.target.value)} />}
            </Field>
            <Button type="submit" loading={agregando} className="w-full">
              <UserPlus className="h-4 w-4" /> Agregar
            </Button>
          </form>
        </Card>
      </div>
    </>
  );
}
