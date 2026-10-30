"use client";

import { ShieldAlert } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { EmptyState, LinkButton, Spinner } from "@/components/ui";
import type { Rol, Usuario } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Protege una página en el cliente: redirige a /login si no hay sesión y muestra
 * "sin permisos" si el usuario no cumple la condición. La API valida igualmente cada petición.
 */
export default function RequireAuth({
  roles,
  check,
  children,
}: {
  roles?: Rol[];
  check?: (user: Usuario) => boolean;
  children: (user: Usuario) => React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [loading, user, router, pathname]);

  if (loading || !user) return <Spinner className="py-32" label="Cargando…" />;
  if ((roles && !roles.includes(user.rol)) || (check && !check(user)))
    return (
      <div className="mx-auto max-w-xl px-4 py-20">
        <EmptyState
          icon={ShieldAlert}
          title="No tienes acceso a esta sección"
          description="Tu cuenta no tiene los permisos necesarios para ver esta página."
          action={<LinkButton href="/">Volver al inicio</LinkButton>}
        />
      </div>
    );
  return <>{children(user)}</>;
}
