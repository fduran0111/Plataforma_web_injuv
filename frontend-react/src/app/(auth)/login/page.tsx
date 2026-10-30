"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Alert, Button, Checkbox, Field, Input } from "@/components/ui";
import { homeForRole, useAuth } from "@/providers/AuthProvider";

function LoginForm() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(next || homeForRole(user));
  }, [loading, user, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const u = await login(email.trim(), password, remember);
      router.replace(next || homeForRole(u));
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error && <Alert>{error}</Alert>}
      <Field label="Correo electrónico" required>
        {(id) => (
          <Input id={id} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.cl" />
        )}
      </Field>
      <Field label="Contraseña" required>
        {(id) => (
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      <Checkbox label="Mantener sesión iniciada" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
      <Button type="submit" size="lg" className="w-full" loading={submitting}>
        Iniciar sesión
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-fg">Bienvenido/a de vuelta</h1>
      <p className="mb-8 mt-2 text-fg-muted">Ingresa para postular y seguir tus voluntariados.</p>
      <Suspense>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-sm text-fg-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-brand hover:underline">
          Regístrate gratis
        </Link>
      </p>
    </>
  );
}
