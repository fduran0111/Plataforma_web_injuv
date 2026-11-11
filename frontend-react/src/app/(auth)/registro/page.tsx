"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Button, Field, Input, PasswordInput } from "@/components/ui";
import { formatRut } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

function rutValido(rut: string): boolean {
  const clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 8 || clean.length > 9) return false;
  let total = 0;
  let factor = 2;
  for (const d of clean.slice(0, -1).split("").reverse()) {
    total += Number(d) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (total % 11);
  return clean.slice(-1) === (dv === 11 ? "0" : dv === 10 ? "K" : String(dv));
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="border-b-[1.5px] border-tinta/15 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-fg-muted">
        {titulo}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

export default function RegistroPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", rut: "", fecha_nacimiento: "", password: "", confirm: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const rutError = form.rut.length > 3 && !rutValido(form.rut) ? "RUT inválido" : undefined;
  const confirmError = form.confirm && form.confirm !== form.password ? "Las contraseñas no coinciden" : undefined;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!rutValido(form.rut)) return setError("Revisa el RUT ingresado");
    if (form.password !== form.confirm) return setError("Las contraseñas no coinciden");
    setSubmitting(true);
    try {
      await register({
        nombre: form.nombre,
        apellido: form.apellido,
        email: form.email,
        fecha_nacimiento: form.fecha_nacimiento,
        password: form.password,
        rut: form.rut.replace(/[^0-9kK]/g, ""),
      });
      router.replace("/perfil?bienvenida=1");
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <>
      <h1 className="font-display text-[clamp(2.4rem,1.4rem+3vw,3.75rem)] leading-[0.95] tracking-[-0.03em] text-fg">
        <span className="linea">
          <span>Crea tu cuenta</span>
        </span>
      </h1>
      <p className="hero-sigue mt-4 max-w-[38ch] text-fg-secondary">Regístrate para postular a voluntariados y certificar tus horas.</p>
      <form onSubmit={onSubmit} className="hero-sigue mt-10 space-y-7">
        {error && <Alert>{error}</Alert>}
        <Seccion titulo="Tus datos">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" required>
              {(id) => <Input id={id} required autoComplete="given-name" value={form.nombre} onChange={set("nombre")} />}
            </Field>
            <Field label="Apellido" required>
              {(id) => <Input id={id} required autoComplete="family-name" value={form.apellido} onChange={set("apellido")} />}
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="RUT" required error={rutError} reserve hint="Ej.: 12.345.678-5. Se formatea solo mientras escribes.">
              {(id) => (
                <Input
                  id={id}
                  required
                  placeholder="12.345.678-9"
                  value={form.rut}
                  onChange={(e) => setForm((f) => ({ ...f, rut: formatRut(e.target.value) }))}
                />
              )}
            </Field>
            <Field label="Fecha de nacimiento" required hint="Debes tener al menos 15 años">
              {(id) => <Input id={id} type="date" required value={form.fecha_nacimiento} onChange={set("fecha_nacimiento")} />}
            </Field>
          </div>
        </Seccion>
        <Seccion titulo="Tu cuenta">
          <Field label="Correo electrónico" required>
            {(id) => <Input id={id} type="email" required autoComplete="email" value={form.email} onChange={set("email")} />}
          </Field>
          <Field label="Contraseña" required hint="Mínimo 8 caracteres">
            {(id) => <PasswordInput id={id} required minLength={8} autoComplete="new-password" value={form.password} onChange={set("password")} />}
          </Field>
          <Field label="Confirmar contraseña" required error={confirmError} reserve>
            {(id) => <PasswordInput id={id} required autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />}
          </Field>
        </Seccion>
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Crear cuenta
        </Button>
      </form>
      <p className="hero-sigue mt-6 text-center text-sm text-fg-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-brand underline-offset-4 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
