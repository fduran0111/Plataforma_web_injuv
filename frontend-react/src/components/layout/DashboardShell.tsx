"use client";

import { ArrowLeft, ChevronRight, LogOut, Menu, X } from "lucide-react";
import * as m from "motion/react-m";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui";
import { fileUrl } from "@/lib/api";
import { cn, fullName } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import logo from "../../../public/logo-injuv.png";

export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }> };

const EASE = [0.23, 1, 0.32, 1] as const;
/** Alto de cada ítem del menú + separación: el indicador activo se desplaza en múltiplos de esto. */
const PASO = 48;

const hoy = () => new Intl.DateTimeFormat("es-CL", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

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
  const [fecha, setFecha] = useState("");

  useEffect(() => {
    const id = requestAnimationFrame(() => setFecha(hoy()));
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => (href.split("/").length <= 2 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));
  const activo = items.findIndex((i) => isActive(i.href));
  const actual = items[activo];

  const sidebar = (
    <div className="flex h-full flex-col bg-tinta text-papel">
      <div className="flex items-center justify-between gap-3 px-5 pb-6 pt-5">
        <Link href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar">
          <span className="flex h-11 shrink-0 items-center rounded-xl bg-papel px-2.5">
            <Image src={logo} alt="INJUV" height={30} className="h-7 w-auto" />
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-[1.0625rem] leading-tight text-white">{title}</span>
            <span className="block text-xs text-papel/55">Panel de gestión</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-papel/70 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Cerrar menú"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <p className="px-6 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-papel/40">Menú</p>
      <nav className="relative flex-1 overflow-y-auto px-3" aria-label={title}>
        <div className="relative">
          {activo >= 0 && (
            <span
              aria-hidden
              className="absolute inset-x-0 top-0 h-11 rounded-xl bg-white/[0.09] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
              style={{ transform: `translateY(${activo * PASO}px)` }}
            >
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-ambar" />
            </span>
          )}
          <ul className="relative space-y-1">
            {items.map(({ href, label, icon: Icon }) => {
              const on = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "group flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ambar",
                      on ? "text-white" : "text-papel/65 hover:bg-white/[0.04] hover:text-white",
                    )}
                  >
                    <Icon className={cn("h-[18px] w-[18px] shrink-0 transition-colors", on ? "text-ambar" : "text-papel/50 group-hover:text-papel/80")} />
                    <span className="flex-1 truncate">{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="space-y-2 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-papel/60 transition-colors hover:bg-white/[0.04] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al sitio
        </Link>
        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] p-3">
          <Avatar name={fullName(user)} src={user?.tiene_foto ? fileUrl.foto(user.id, user.foto_version) : null} size={38} className="ring-tinta" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{fullName(user)}</p>
            <p className="truncate text-xs text-papel/55">{user?.email}</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="rounded-lg p-2 text-papel/60 transition-colors hover:bg-brand-red/15 hover:text-[#ff8a8e]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="panel flex min-h-0 flex-1 bg-page">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] lg:block">{sidebar}</aside>

      <div className={cn("fixed inset-0 z-50 lg:hidden", !open && "pointer-events-none")} aria-hidden={!open} inert={!open}>
        <div
          className={cn("absolute inset-0 bg-tinta/55 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "panel-cajon absolute inset-y-0 left-0 w-[18rem] max-w-[85vw] shadow-[24px_0_48px_-24px_rgb(15_27_45/0.6)]",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidebar}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[17rem]">
        <header className="sticky top-0 z-30 border-b border-tinta/[0.07] bg-page/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[90rem] items-center gap-3 px-4 sm:px-6 lg:px-10">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="-ml-1 rounded-lg p-2 text-fg-secondary transition-colors hover:bg-tinta/[0.06] lg:hidden"
              aria-label="Abrir menú"
              aria-expanded={open}
            >
              <Menu className="h-5 w-5" />
            </button>
            <nav aria-label="Ruta" className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="truncate text-fg-muted">{title}</span>
              {actual && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-fg-muted/70" />
                  <span className="truncate font-semibold text-fg">{actual.label}</span>
                </>
              )}
            </nav>
            <p className="ml-auto hidden text-sm text-fg-muted first-letter:uppercase sm:block">{fecha}</p>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[90rem] flex-1 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          <m.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE }}>
            {children}
          </m.div>
        </main>
      </div>
    </div>
  );
}
