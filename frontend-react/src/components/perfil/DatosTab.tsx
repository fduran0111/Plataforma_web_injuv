"use client";

import { Camera, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Alert, Avatar, Button, Card, Field, Input, Modal, Select } from "@/components/ui";
import UbicacionFields from "@/components/UbicacionFields";
import { apiFetch, fileUrl } from "@/lib/api";
import { fullName } from "@/lib/format";
import type { Usuario } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

const SEXOS = ["Femenino", "Masculino", "Otro", "Prefiero no decir"];

export default function DatosTab({ user }: { user: Usuario }) {
  const { setUser, logout } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...user });
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const updated = await apiFetch<Usuario>("/usuarios/me", {
        method: "PUT",
        body: {
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          telefono: form.telefono || null,
          region: form.region || null,
          ciudad: form.ciudad || null,
          comuna: form.comuna || null,
          sexo: form.sexo || null,
          fecha_nacimiento: form.fecha_nacimiento || null,
        },
      });
      setUser(updated);
      toast("Datos guardados");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function subirFoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const body = new FormData();
      body.append("imagen", file);
      const updated = await apiFetch<Usuario>("/usuarios/me/foto", { method: "POST", body });
      setUser(updated);
      toast("Foto actualizada");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function eliminarFoto() {
    setPhotoBusy(true);
    try {
      const updated = await apiFetch<Usuario>("/usuarios/me/foto", { method: "DELETE" });
      setUser(updated);
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function eliminarCuenta() {
    setDeleting(true);
    try {
      await apiFetch("/usuarios/me", { method: "DELETE", body: { password } });
      logout();
      router.replace("/");
    } catch (err) {
      toast((err as Error).message, "error");
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <Card className="h-fit p-6 text-center">
        <Avatar name={fullName(user)} src={user.tiene_foto ? fileUrl.foto(user.id, user.foto_version) : null} size={120} className="mx-auto" />
        <p className="mt-3 font-semibold text-fg">{fullName(user)}</p>
        <p className="text-sm text-fg-muted">{user.rut}</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => subirFoto(e.target.files?.[0])} />
        <div className="mt-4 flex justify-center gap-2">
          <Button size="sm" variant="outline" loading={photoBusy} onClick={() => fileRef.current?.click()}>
            <Camera className="h-4 w-4" /> Cambiar foto
          </Button>
          {user.tiene_foto && (
            <Button size="sm" variant="ghost" onClick={eliminarFoto}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-2 text-xs text-fg-muted">JPG o PNG, máx. 5 MB</p>
      </Card>

      <div className="space-y-6">
        <Card className="p-6 sm:p-8">
          <h2 className="font-semibold text-fg">Datos personales y de contacto</h2>
          <form onSubmit={guardar} className="mt-5 grid gap-4 sm:grid-cols-2">
            {error && <Alert className="sm:col-span-2">{error}</Alert>}
            <Field label="Nombre" required>
              {(id) => <Input id={id} required value={form.nombre} onChange={set("nombre")} />}
            </Field>
            <Field label="Apellido" required>
              {(id) => <Input id={id} required value={form.apellido} onChange={set("apellido")} />}
            </Field>
            <Field label="Correo electrónico" required>
              {(id) => <Input id={id} type="email" required value={form.email} onChange={set("email")} />}
            </Field>
            <Field label="Teléfono">
              {(id) => <Input id={id} type="tel" value={form.telefono} onChange={set("telefono")} placeholder="+56 9 ..." />}
            </Field>
            <UbicacionFields
              region={form.region}
              ciudad={form.ciudad}
              comuna={form.comuna}
              onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
            />
            <Field label="Sexo">
              {(id) => <Select id={id} value={form.sexo} onChange={set("sexo")} options={SEXOS} placeholder="Selecciona" />}
            </Field>
            <Field label="Fecha de nacimiento">
              {(id) => <Input id={id} type="date" value={form.fecha_nacimiento ?? ""} onChange={set("fecha_nacimiento")} />}
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" loading={saving}>
                Guardar cambios
              </Button>
            </div>
          </form>
        </Card>

        <Card className="border-red-200 p-6 sm:p-8">
          <h2 className="font-semibold text-red-700">Zona de riesgo</h2>
          <p className="mt-1 text-sm text-fg-muted">Eliminar tu cuenta borra tu perfil, postulaciones y certificados. Esta acción no se puede deshacer.</p>
          <Button variant="danger" size="sm" className="mt-4" onClick={() => setDeleteOpen(true)}>
            Eliminar mi cuenta
          </Button>
        </Card>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Eliminar cuenta"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} disabled={!password} onClick={eliminarCuenta}>
              Eliminar definitivamente
            </Button>
          </>
        }
      >
        <Field label="Ingresa tu contraseña para confirmar" required>
          {(id) => <Input id={id} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />}
        </Field>
      </Modal>
    </div>
  );
}
