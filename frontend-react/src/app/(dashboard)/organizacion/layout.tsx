"use client";

import { Building2, GraduationCap, LayoutDashboard, MessageSquareQuote, ShieldAlert, UserPlus, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import RequireAuth from "@/components/RequireAuth";
import { EmptyState, LinkButton } from "@/components/ui";

const NAV = [
  { href: "/organizacion", label: "Resumen", icon: LayoutDashboard },
  { href: "/organizacion/oportunidades", label: "Voluntariados", icon: Users },
  { href: "/organizacion/perfil", label: "Perfil de la organización", icon: Building2, soloAdmin: true },
  { href: "/organizacion/academia", label: "Academia", icon: GraduationCap },
  { href: "/organizacion/resenas", label: "Reseñas", icon: MessageSquareQuote, soloAdmin: true },
  { href: "/organizacion/equipo", label: "Equipo", icon: UserPlus, soloAdmin: true },
];

export default function OrganizacionLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <RequireAuth check={(u) => !!u.organizacion}>
      {(user) => {
        const esMiembro = user.organizacion?.rol === "miembro";
        const items = NAV.filter((i) => !(esMiembro && i.soloAdmin)).map(({ href, label, icon }) => ({ href, label, icon }));
        const bloqueada = esMiembro && NAV.some((i) => i.soloAdmin && pathname.startsWith(i.href));
        return (
          <DashboardShell title="Mi organización" items={items}>
            {bloqueada ? (
              <EmptyState
                icon={ShieldAlert}
                title="Sección solo para el administrador de la organización"
                description="Como miembro puedes gestionar los voluntariados y la academia."
                action={<LinkButton href="/organizacion/oportunidades">Ir a voluntariados</LinkButton>}
              />
            ) : (
              children
            )}
          </DashboardShell>
        );
      }}
    </RequireAuth>
  );
}
