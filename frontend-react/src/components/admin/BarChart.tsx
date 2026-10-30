import { formatNumber } from "@/lib/format";

export default function BarChart({ data, color = "bg-brand" }: { data: { label: string; cantidad: number }[]; color?: string }) {
  const max = Math.max(1, ...data.map((d) => d.cantidad));
  return (
    <div className="flex h-44 items-end gap-1.5">
      {data.map((d) => (
        <div key={d.label} className="group flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[10px] font-semibold text-fg-muted opacity-0 transition group-hover:opacity-100">{d.cantidad}</span>
          <div className={`w-full max-w-10 rounded-t-md ${color}`} style={{ height: `${Math.max(2, (d.cantidad / max) * 120)}px` }} title={`${d.label}: ${formatNumber(d.cantidad)}`} />
          <span className="w-full truncate text-center text-[10px] text-fg-muted">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function HBarChart({ data }: { data: { label: string; cantidad: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.cantidad));
  const total = data.reduce((a, d) => a + d.cantidad, 0) || 1;
  return (
    <div className="space-y-2.5">
      {data.slice(0, 10).map((d) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-36 truncate text-fg-secondary" title={d.label}>
            {d.label}
          </span>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-page">
            <div className="h-full rounded-full bg-brand" style={{ width: `${(d.cantidad / max) * 100}%` }} />
          </div>
          <span className="w-16 text-right text-xs text-fg-muted">
            {formatNumber(d.cantidad)} <span className="text-[10px]">({Math.round((d.cantidad / total) * 100)}%)</span>
          </span>
        </div>
      ))}
    </div>
  );
}
