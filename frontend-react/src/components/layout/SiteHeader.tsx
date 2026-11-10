"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import UserMenu from "@/components/layout/UserMenu";
import { NAV_LINKS } from "@/components/layout/nav";
import { LinkButton } from "@/components/ui";
import { cn } from "@/lib/format";
import { useAuth } from "@/providers/AuthProvider";
import logo from "../../../public/logo-injuv.png";

export default function SiteHeader() {
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [oculta, setOculta] = useState(false);
  const [elevada, setElevada] = useState(false);
  const focusRef = useRef(false);

  // Ocultar al bajar / mostrar al subir: nunca con el menú abierto, arriba (<80px) o con foco dentro.
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setElevada(y > 8);
        if (!open && !focusRef.current && y > 80 && y > lastY + 4) setOculta(true);
        else if (y < lastY - 4 || y <= 80) setOculta(false);
        lastY = y;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b-[1.5px] border-tinta bg-papel transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
        oculta && !open ? "-translate-y-full" : "translate-y-0",
        elevada && "shadow-[0_10px_30px_-18px_rgb(15_27_45/0.45)]",
      )}
      onFocusCapture={() => (focusRef.current = true)}
      onBlurCapture={() => (focusRef.current = false)}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-3 transition-transform duration-200 hover:scale-[1.02]" onClick={() => setOpen(false)}>
          <Image src={logo} alt="INJUV" height={40} priority className="h-10 w-auto" />
          <span className="hidden border-l-[1.5px] border-tinta/30 pl-3 font-display text-sm leading-tight text-fg xl:block">
            Voluntariado
            <br />
            <span className="font-sans text-xs text-fg-muted [font-variation-settings:normal]">Plataforma nacional</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex" aria-label="Principal">
          {NAV_LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative px-3 py-2 text-sm font-medium transition-colors",
                  active ? "text-tinta" : "text-fg-secondary hover:text-tinta",
                )}
              >
                {l.label}
                {/* Subrayado: trazo corto que crece desde la izquierda (solo transform) */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-3 -bottom-px h-[3px] origin-left rounded-full transition-transform duration-200 ease-[var(--ease-out)]",
                    active ? "scale-x-100 bg-ambar" : "scale-x-0 bg-tinta group-hover:scale-x-100",
                  )}
                />
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {!loading &&
            (user ? (
              <UserMenu />
            ) : (
              <LinkButton href="/login" size="sm">
                Iniciar sesión
              </LinkButton>
            ))}
          <button
            type="button"
            className="rounded-md p-2 text-fg-secondary hover:bg-tinta/8 lg:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="menu-movil border-t-[1.5px] border-dashed border-tinta/30 bg-papel px-4 py-3 lg:hidden" aria-label="Principal móvil">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium",
                isActive(l.href) ? "text-tinta" : "text-fg-secondary",
              )}
            >
              <span className={cn("h-[3px] w-4 rounded-full", isActive(l.href) ? "bg-ambar" : "bg-tinta/20")} aria-hidden />
              {l.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="flex h-1">
        <div className="w-2/5 bg-brand" />
        <div className="w-3/5 bg-brand-red" />
      </div>
    </header>
  );
}
