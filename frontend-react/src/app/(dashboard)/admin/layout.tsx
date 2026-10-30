"use client";

import { BarChart3, Building2, FileText, Inbox, Library, MessageSquareQuote, Newspaper, Users } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import RequireAuth from "@/components/RequireAuth";

const NAV = [
  { href: "/admin", label: "Resumen", icon: BarChart3 },
  { href: "/admin/solicitudes", label: "Solicitudes", icon: Inbox },
  { href: "/admin/usuarios", label: "Usuarios", icon: Users },
  { href: "/admin/organizaciones", label: "Organizaciones", icon: Building2 },
  { href: "/admin/oportunidades", label: "Voluntariados", icon: FileText },
  { href: "/admin/noticias", label: "Noticias", icon: Newspaper },
  { href: "/admin/repositorio", label: "Repositorio", icon: Library },
  { href: "/admin/resenas", label: "Reseñas", icon: MessageSquareQuote },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth roles={["admin"]}>{() => <DashboardShell title="Administración" items={NAV}>{children}</DashboardShell>}</RequireAuth>
  );
}
