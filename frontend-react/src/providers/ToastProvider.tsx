"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/format";

type ToastKind = "success" | "error" | "info";
type Toast = { id: number; kind: ToastKind; message: string };

const ToastContext = createContext<((message: string, kind?: ToastKind) => void) | null>(null);

const ICONS = { success: CheckCircle2, error: XCircle, info: Info };
const STYLES = {
  success: "border-emerald-200 text-emerald-800",
  error: "border-red-200 text-red-800",
  info: "border-blue-200 text-blue-800",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              className={cn("pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm shadow-lg", STYLES[t.kind])}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
