"use client";

import { Building2, ChevronDown, LayoutDashboard, LogOut, Shield, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { fileUrl } from "@/lib/api";
import { ROL_LABEL } from "@/lib/constants";
import { fullName } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!user) return null;
  const name = fullName(user);
  const links = [
    { href: "/perfil", label: "Mi perfil", icon: User, show: true },
    { href: "/organizacion", label: "Panel de organización", icon: Building2, show: !!user.organizacion },
    { href: "/admin", label: "Administración", icon: Shield, show: user.rol === "admin" },
  ].filter((l) => l.show);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-2.5 transition hover:bg-page"
        aria-expanded={open}
      >
        <Avatar name={name} src={user.tiene_foto ? fileUrl.foto(user.id, user.foto_version) : null} size={30} />
        <span className="hidden max-w-32 truncate text-sm font-medium text-fg sm:block">{user.nombre || name}</span>
        <ChevronDown className="h-4 w-4 text-fg-muted" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-fg">{name}</p>
            <p className="truncate text-xs text-fg-muted">{user.email}</p>
            <p className="mt-1 text-xs font-medium text-brand">{ROL_LABEL[user.rol]}</p>
          </div>
          <nav className="p-1.5">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-secondary hover:bg-page hover:text-fg"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {links.length === 0 && (
              <Link href="/perfil" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-fg-secondary hover:bg-page">
                <LayoutDashboard className="h-4 w-4" />
                Mi panel
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                setOpen(false);
                router.push("/");
              }}
              className="mt-1 flex w-full items-center gap-2.5 rounded-lg border-t border-border px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}
