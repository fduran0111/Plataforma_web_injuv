"use client";

import { ArrowLeft, LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar } from "@/components/ui";
import { fileUrl } from "@/lib/api";
import { cn, fullName } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import logo from "../../../public/logo-injuv.png";

export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

export default function DashboardShell({
  title,
  items,
  children,
}: {
  title: string;
  items: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href.split("/").length <= 2 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src={logo} alt="INJUV" height={36} className="h-9 w-auto" />
          <span className="text-sm font-semibold text-fg">{title}</span>
        </Link>
        <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-fg-muted hover:bg-page lg:hidden" aria-label="Cerrar menú">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
              isActive(href) ? "bg-brand text-white shadow-sm" : "text-fg-secondary hover:bg-page hover:text-fg",
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <Link href="/" className="mb-1 flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm text-fg-muted hover:bg-page">
          <ArrowLeft className="h-4 w-4" /> Volver al sitio
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl bg-page px-3.5 py-3">
          <Avatar name={fullName(user)} src={user?.tiene_foto ? fileUrl.foto(user.id, user.foto_version) : null} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{fullName(user)}</p>
            <p className="truncate text-xs text-fg-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar sesión"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="rounded-lg p-1.5 text-fg-muted hover:bg-surface hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-border bg-surface lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-surface shadow-xl">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur-md lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-1.5 text-fg-secondary hover:bg-page" aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-fg">{title}</span>
        </div>
        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
