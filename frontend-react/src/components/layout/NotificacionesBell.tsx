"use client";

import { Bell, CheckCheck, ClipboardList, Megaphone, Star, UserCheck, UserPlus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/format";
import type { Notificacion, NotificacionesResp } from "@/lib/types";

const ICONO: Record<string, typeof Bell> = {
  nueva_postulacion: UserPlus,
  postulacion_enviada: ClipboardList,
  estado_postulacion: UserCheck,
  anuncio_foro: Megaphone,
  pendiente_calificar: Star,
  encargado_asignado: ClipboardList,
};

function hace(iso: string | null): string {
  if (!iso) return "";
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d < 7 ? `Hace ${d} d` : new Date(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" });
}

export default function NotificacionesBell() {
  const [open, setOpen] = useState(false);
  const [noLeidas, setNoLeidas] = useState(0);
  const [items, setItems] = useState<Notificacion[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const contar = useCallback(async () => {
    if (document.visibilityState !== "visible") return;
    try {
      setNoLeidas((await apiFetch<{ no_leidas: number }>("/notificaciones/contador")).no_leidas);
    } catch {
      /* sin red o sesión expirada: se reintenta en el próximo ciclo */
    }
  }, []);

  useEffect(() => {
    const inicial = window.setTimeout(contar, 0);
    const id = window.setInterval(contar, 30_000);
    document.addEventListener("visibilitychange", contar);
    return () => {
      window.clearTimeout(inicial);
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", contar);
    };
  }, [contar]);

  useEffect(() => {
    if (!open) return;
    apiFetch<NotificacionesResp>("/notificaciones")
      .then((r) => {
        setItems(r.items);
        setNoLeidas(r.no_leidas);
      })
      .catch(() => setItems([]));
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function leer(n: Notificacion) {
    setOpen(false);
    if (n.leida) return;
    setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) ?? null);
    setNoLeidas((c) => Math.max(0, c - 1));
    apiFetch(`/notificaciones/${n.id}/leer`, { method: "POST" }).catch(() => {});
  }

  async function leerTodas() {
    setItems((prev) => prev?.map((x) => ({ ...x, leida: true })) ?? null);
    setNoLeidas(0);
    apiFetch("/notificaciones/leer-todas", { method: "POST" }).catch(() => {});
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-10 w-10 place-items-center rounded-full text-fg-secondary transition-colors hover:bg-tinta/8 hover:text-tinta active:scale-[0.96]"
        aria-expanded={open}
        aria-label={noLeidas ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
      >
        <Bell className="h-5 w-5" />
        {noLeidas > 0 && (
          <span className="absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-red px-1 text-[11px] font-semibold leading-none text-white tabular-nums ring-2 ring-papel">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div
          data-panel-notificaciones
          className="fixed inset-x-3 top-[4.5rem] overflow-hidden rounded-2xl border border-border bg-surface shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-[22rem]"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-fg">Notificaciones</p>
            {noLeidas > 0 && (
              <button type="button" onClick={leerTodas} className="flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas como leídas
              </button>
            )}
          </div>
          <div className="max-h-[26rem] overflow-y-auto overscroll-contain">
            {items === null ? (
              <div className="space-y-3 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-page" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-fg-muted" strokeWidth={1.5} />
                <p className="mt-3 text-sm font-medium text-fg">Todo al día</p>
                <p className="mt-1 text-xs text-fg-secondary [text-wrap:pretty]">
                  Aquí verás las postulaciones, los cambios de estado y los anuncios de tus voluntariados.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const Icon = ICONO[n.tipo] ?? Bell;
                  const cuerpo = (
                    <>
                      <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", n.leida ? "bg-page text-fg-muted" : "bg-brand-soft text-brand")}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-sm [overflow-wrap:anywhere]", n.leida ? "text-fg-secondary" : "font-semibold text-fg")}>{n.titulo}</span>
                        {n.texto && <span className="mt-0.5 line-clamp-2 block text-xs text-fg-secondary [overflow-wrap:anywhere]">{n.texto}</span>}
                        <span className="mt-1 block text-[11px] text-fg-muted">{hace(n.created_at)}</span>
                      </span>
                      {!n.leida && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-red" aria-label="Sin leer" />}
                    </>
                  );
                  const cls = cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-page", !n.leida && "bg-brand-soft/40");
                  return (
                    <li key={n.id}>
                      {n.enlace ? (
                        <Link href={n.enlace} onClick={() => leer(n)} className={cls}>
                          {cuerpo}
                        </Link>
                      ) : (
                        <button type="button" onClick={() => leer(n)} className={cls}>
                          {cuerpo}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
