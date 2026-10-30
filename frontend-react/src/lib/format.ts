const dateFmt = new Intl.DateTimeFormat("es-CL", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("es-CL", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Fechas `YYYY-MM-DD` se interpretan en hora local (no UTC) para no correr un día. */
function parse(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function formatDate(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const d = parse(value);
  return Number.isNaN(d.getTime()) ? fallback : dateFmt.format(d);
}

export function formatDateTime(value: string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const d = parse(value);
  return Number.isNaN(d.getTime()) ? fallback : dateTimeFmt.format(d);
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(size < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatNumber(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString("es-CL");
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const target = parse(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "?"
  );
}

export function fullName(u: { nombre?: string; apellido?: string; email?: string } | null | undefined): string {
  if (!u) return "";
  return `${u.nombre ?? ""} ${u.apellido ?? ""}`.trim() || u.email || "Usuario";
}

/** Formatea un RUT limpio (12345678K) como 12.345.678-K. */
export function formatRut(rut: string): string {
  const clean = rut.replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length < 2) return clean;
  const body = clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${body}-${clean.slice(-1)}`;
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}
