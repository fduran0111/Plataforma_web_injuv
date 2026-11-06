"use client";

import { Loader2, Star, X } from "lucide-react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { Tone } from "@/lib/constants";
import { cn, initials } from "@/lib/format";

/* ---------- Botones ---------- */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

const SOLID = "boton-solido border-[1.5px] border-tinta";
const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: `${SOLID} bg-brand text-white hover:bg-brand-dark`,
  secondary: `${SOLID} bg-papel-strong text-tinta hover:bg-papel`,
  outline: `${SOLID} bg-surface text-tinta hover:bg-papel`,
  ghost: "text-fg-secondary hover:bg-tinta/8 hover:text-fg",
  danger: `${SOLID} bg-brand-red text-white hover:bg-[#c41f26]`,
};
const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3.5 text-sm gap-1.5",
  md: "h-10 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra?: string) {
  return cn(
    "inline-flex items-center justify-center whitespace-nowrap rounded-md font-semibold tracking-[0.01em] transition-[background-color,color,transform] duration-200 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar",
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    extra,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize; loading?: boolean }) {
  return (
    <button
      type="button"
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ---------- Formularios ---------- */

const CONTROL =
  "w-full rounded-md border-[1.5px] border-tinta/35 bg-surface px-3.5 text-sm text-fg placeholder:text-fg-muted transition-[border-color,box-shadow] focus:border-tinta focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--tinta)] disabled:bg-papel-strong disabled:text-fg-muted";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (id: string) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-fg-secondary">
          {label}
          {required && <span className="text-brand-red"> *</span>}
        </label>
      )}
      {children(id)}
      {error ? <p className="text-xs text-brand-red">{error}</p> : hint && <p className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-11", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-28 py-2.5", className)} {...props} />;
}

export function Select({
  className,
  options,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: (string | { value: string | number; label: string })[];
  placeholder?: string;
}) {
  return (
    <select className={cn(CONTROL, "h-11 pr-8", className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => {
        const opt = typeof o === "string" ? { value: o, label: o } : o;
        return (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        );
      })}
    </select>
  );
}

export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-fg-secondary">
      <input type="checkbox" className="h-4 w-4 rounded-sm border-tinta accent-brand" {...props} />
      {label}
    </label>
  );
}

/* ---------- Recorte (tarjeta de papel) ---------- */

/** Rotación determinística en [-0.6deg, 0.6deg] a partir de un id. */
export function tilt(id: string | number, max = 0.6): number {
  let h = 2166136261;
  for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (((h >>> 0) % 1000) / 999) * 2 * max - max;
}

/**
 * Tarjeta "recorte": borde de tinta, sombra dura desplazada y una leve rotación propia
 * que se endereza con resorte al pasar el mouse. Requiere `MotionProvider` (usa `m`).
 */
export function Recorte({
  id,
  className,
  children,
  interactive = true,
  ...props
}: Omit<React.ComponentProps<typeof m.div>, "id" | "children"> & {
  id: string | number;
  interactive?: boolean;
  children: React.ReactNode;
}) {
  const base = tilt(id);
  return (
    <m.div
      initial={false}
      style={{ rotate: base }}
      whileHover={interactive ? { rotate: 0 } : undefined}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={cn("recorte", interactive && "recorte-hover", className)}
      {...props}
    >
      {children}
    </m.div>
  );
}

/* ---------- TrazoTitulo ---------- */

/** Título con subrayado SVG "a mano" que se dibuja al entrar en vista. */
export function TrazoTitulo({
  as: Tag = "h2",
  color = "var(--brand-primary)",
  className,
  children,
}: {
  as?: "h1" | "h2" | "h3" | "span";
  color?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag className={cn("relative inline-block", className)}>
      {children}
      <svg
        aria-hidden
        viewBox="0 0 240 14"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-[0.18em] left-0 h-[0.32em] w-full overflow-visible"
      >
        <m.path
          d="M3 9 C 48 3, 92 12, 136 7 S 204 2, 237 8"
          className="trazo"
          stroke={color}
          strokeWidth={4}
          initial={{ pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.7, ease: [0.3, 0.9, 0.3, 1] }}
        />
      </svg>
    </Tag>
  );
}

/* ---------- Visualización ---------- */

const TONES: Record<Tone, string> = {
  neutral: "bg-papel-strong text-fg-secondary ring-tinta/15",
  slate: "bg-slate-100 text-slate-700 ring-slate-300",
  blue: "bg-brand-soft text-brand-dark ring-brand/30",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-300",
  red: "bg-red-50 text-red-800 ring-red-300",
  amber: "bg-amber-50 text-amber-900 ring-amber-300",
  violet: "bg-violet-50 text-violet-800 ring-violet-300",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function Card({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("recorte", className)} {...props}>
      {children}
    </div>
  );
}

export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 py-12 text-fg-muted", className)}>
      <Loader2 className="h-5 w-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function Alert({
  tone = "red",
  children,
  className,
}: {
  tone?: "red" | "green" | "amber" | "blue";
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    red: "border-red-300 bg-red-50 text-red-900",
    green: "border-emerald-300 bg-emerald-50 text-emerald-900",
    amber: "border-amber-300 bg-amber-50 text-amber-950",
    blue: "border-brand/40 bg-brand-soft text-brand-dark",
  };
  return <div className={cn("rounded-md border-[1.5px] px-4 py-3 text-sm", styles[tone], className)}>{children}</div>;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-tinta/40 bg-surface/60 px-6 py-14 text-center">
      <div className="mb-4 rounded-md border-[1.5px] border-tinta bg-papel p-3 text-tinta">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="text-h3 text-fg">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert className="flex items-center justify-between gap-4">
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </Alert>
  );
}

export function Avatar({ name, src, size = 40, className }: { name: string; src?: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, fontSize: Math.max(11, size * 0.38) };
  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- imágenes servidas por la API, tamaño variable
      <img
        src={src}
        alt={name}
        style={style}
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full object-cover ring-2 ring-surface", className)}
      />
    );
  }
  return (
    <div
      style={style}
      className={cn("flex shrink-0 items-center justify-center rounded-full bg-tinta font-display font-semibold text-papel ring-2 ring-surface", className)}
    >
      {initials(name)}
    </div>
  );
}

export function Stars({ value, size = 16, onChange }: { value: number | null; size?: number; onChange?: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;
  return (
    <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(null)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = shown >= i - 0.25;
        const star = (
          <Star
            style={{ width: size, height: size }}
            className={filled ? "fill-ambar text-ambar" : "text-tinta/25"}
          />
        );
        return onChange ? (
          <button
            key={i}
            type="button"
            aria-label={`${i} estrellas`}
            onMouseEnter={() => setHover(i)}
            onClick={() => onChange(i)}
            className="p-0.5"
          >
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "blue",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "blue" | "green" | "amber" | "violet" | "red";
}) {
  const tones = {
    blue: "bg-brand-soft text-brand",
    green: "bg-tinta text-ambar",
    amber: "bg-ambar/20 text-[#8a5a0b]",
    violet: "bg-brand text-white",
    red: "bg-red-50 text-red-700",
  };
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg-muted">{label}</p>
          <p className="mt-2 font-display text-[2rem] leading-none tracking-[-0.02em] text-fg tabular-nums">{value}</p>
          {hint && <p className="mt-2 text-xs text-fg-muted">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-h2 text-fg">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="pestanas flex gap-1 overflow-x-auto rounded-md border-[1.5px] border-tinta/15 bg-papel-strong p-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-sm px-3.5 py-2 text-sm font-medium transition-colors",
            value === t.value ? "bg-tinta text-papel" : "text-fg-muted hover:text-fg",
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className={cn("rounded-sm px-1.5 text-xs tabular-nums", value === t.value ? "bg-papel/20 text-papel" : "bg-tinta/10")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Modal ---------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-tinta/60 p-0 sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn("recorte flex max-h-[92vh] w-full flex-col rounded-t-lg border-b-0 sm:rounded-lg sm:border-b-[1.5px]", widths[size])}
      >
        <div className="flex items-start justify-between gap-4 border-b-[1.5px] border-tinta/15 px-6 py-4">
          <div>
            <h2 className="text-h3 text-fg">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-md p-1 text-fg-muted hover:bg-tinta/8 hover:text-fg">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t-[1.5px] border-tinta/15 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirmar",
  danger,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm text-fg-secondary">{message}</div>
    </Modal>
  );
}
