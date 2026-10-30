"use client";

import { Building2, GraduationCap, LayoutDashboard, MessageSquareQuote, Users } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import RequireAuth from "@/components/RequireAuth";

const NAV = [
  { href: "/organizacion", label: "Resumen", icon: LayoutDashboard },
  { href: "/organizacion/oportunidades", label: "Voluntariados", icon: Users },
  { href: "/organizacion/perfil", label: "Perfil de la organización", icon: Building2 },
  { href: "/organizacion/academia", label: "Academia", icon: GraduationCap },
  { href: "/organizacion/resenas", label: "Reseñas", icon: MessageSquareQuote },
];

export default function OrganizacionLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth check={(u) => !!u.organizacion}>
      {() => <DashboardShell title="Mi organización" items={NAV}>{children}</DashboardShell>}
    </RequireAuth>
  );
}
