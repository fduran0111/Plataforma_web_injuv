"use client";

import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { Alert, Badge, Button, Card, Input, Spinner, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { PortadaResenasAdmin } from "@/lib/types";
import { useToast } from "@/providers/ToastProvider";

const MAX = 11;
const ESTRELLAS = [5, 4, 3, 2, 1];

const normalizar = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Elige qué reseñas públicas aparecen en el inicio y en qué orden (la primera es la destacada). */
export default function ResenasPortada() {
  const toast = useToast();
  const { data, loading, setData } = useApi<PortadaResenasAdmin>("/portada/resenas");
  const [borrador, setBorrador] = useState<number[] | null>(null);
  const [estrellas, setEstrellas] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [guardando, setGuardando] = useState(false);

  if (loading && !data) return <Spinner label="Cargando reseñas" />;
  if (!data) return <Alert tone="red">No pudimos cargar las reseñas.</Alert>;

  const seleccion = borrador ?? data.seleccionadas;
  const sucio = borrador !== null;
  const fijar = (ids: number[]) => setBorrador(ids);

  const filtradas = data.resenas.filter((r) => {
    if (estrellas !== null && Math.round(r.calificacion ?? -1) !== estrellas) return false;
    const q = normalizar(busqueda);
    if (!q) return true;
    return (
      normalizar(r.resena).includes(q) ||
      normalizar(r.usuario_nombre).includes(q) ||
      normalizar(r.organizacion_nombre).includes(q) ||
      normalizar(r.oportunidad_titulo).includes(q)
    );
  });

  const conteo = (n: number) =>
    data.resenas.filter((r) => (n === -1 ? r.calificacion === null : r.calificacion !== null && Math.round(r.calificacion) === n)).length;

  const guardar = async () => {
    if (borrador === null) return;
    setGuardando(true);
    try {
      setData(await apiFetch<PortadaResenasAdmin>("/portada/resenas", { method: "PUT", body: { ids: borrador } }));
      setBorrador(null);
      toast("Reseñas del inicio guardadas");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <Card className="p-6 lg:col-span-3">
        <h2 className="text-xl font-semibold text-fg">Reseñas disponibles</h2>
        <p className="mb-4 text-sm text-fg-muted">{data.resenas.length} reseñas públicas</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por estrellas">
          <button type="button" className="ficha" aria-pressed={estrellas === null} onClick={() => setEstrellas(null)}>
            Todas <span className="tabular-nums opacity-60">{data.resenas.length}</span>
          </button>
          {ESTRELLAS.map((n) => {
            const total = conteo(n);
            return total === 0 ? null : (
              <button key={n} type="button" className="ficha" aria-pressed={estrellas === n} onClick={() => setEstrellas(n)}>
                {n} ★ <span className="tabular-nums opacity-60">{total}</span>
              </button>
            );
          })}
          {data.resenas.some((r) => r.calificacion === null) && (
            <button type="button" className="ficha" aria-pressed={estrellas === -1} onClick={() => setEstrellas(-1)}>
              Sin nota <span className="tabular-nums opacity-60">{conteo(-1)}</span>
            </button>
          )}
        </div>
        <Input
          className="mt-3"
          placeholder="Buscar por texto, voluntario u organización"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar reseñas"
        />
        <div className="mt-3 max-h-[640px] space-y-3 overflow-y-auto pr-1">
          {filtradas.length === 0 && <p className="py-6 text-center text-sm text-fg-muted">No hay reseñas con este filtro</p>}
          {filtradas.map((r) => {
            const idx = seleccion.indexOf(r.postulacion_id);
            const seleccionada = idx !== -1;
            return (
              <div key={r.postulacion_id} className="flex items-start gap-3 rounded-xl bg-papel-strong p-3 ring-1 ring-tinta/8">
                <div className="min-w-0 flex-1">
                  <Stars value={r.calificacion} size={14} />
                  <p className="mt-1 line-clamp-3 text-sm text-fg">{r.resena}</p>
                  <p className="mt-1 text-xs text-fg-muted">
                    {r.usuario_nombre} · para <span className="font-semibold text-fg">{r.organizacion_nombre}</span> · {formatDate(r.fecha)}
                  </p>
                </div>
                {seleccionada ? (
                  <Button size="sm" variant="ghost" onClick={() => fijar(seleccion.filter((id) => id !== r.postulacion_id))}>
                    <Check className="h-4 w-4 text-brand" /> {idx + 1}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={seleccion.length >= MAX}
                    title={seleccion.length >= MAX ? "Máximo 11 reseñas" : undefined}
                    onClick={() => fijar([...seleccion, r.postulacion_id])}
                  >
                    <Plus className="h-4 w-4" /> Agregar
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="h-fit p-6 lg:col-span-2">
        <h2 className="text-xl font-semibold text-fg">Se muestran en el inicio</h2>
        <p className="mb-2 text-sm text-fg-muted">{seleccion.length} {seleccion.length === 1 ? "elegida" : "elegidas"} · puedes agregar hasta {MAX}</p>
        <p className="mb-4 text-xs text-fg-muted">La primera se muestra en grande; las demás van rotando de a dos.</p>
        {seleccion.length === 0 ? (
          <Alert tone="amber">No hay reseñas elegidas: la sección de reseñas no se muestra en el inicio.</Alert>
        ) : (
          <div className="space-y-3">
            {seleccion.map((id, i) => {
              const r = data.resenas.find((x) => x.postulacion_id === id);
              if (!r) return null;
              return (
                <div key={id} className="flex items-start gap-2 rounded-xl bg-papel-strong p-3 ring-1 ring-tinta/8">
                  <div className="min-w-0 flex-1">
                    {i === 0 && <Badge tone="amber">Destacada</Badge>}
                    <Stars value={r.calificacion} size={14} />
                    <p className="mt-1 line-clamp-2 text-sm text-fg">{r.resena}</p>
                    <p className="mt-1 text-xs text-fg-muted">{r.usuario_nombre} · para <span className="font-semibold text-fg">{r.organizacion_nombre}</span></p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" aria-label="Subir" disabled={i === 0}
                      onClick={() => { const ids = [...seleccion]; [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; fijar(ids); }}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Bajar" disabled={i === seleccion.length - 1}
                      onClick={() => { const ids = [...seleccion]; [ids[i], ids[i + 1]] = [ids[i + 1], ids[i]]; fijar(ids); }}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" aria-label="Quitar" onClick={() => fijar(seleccion.filter((x) => x !== id))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button size="sm" variant="ghost" onClick={() => fijar([])}>Quitar todas</Button>
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button onClick={guardar} loading={guardando} disabled={!sucio}>Guardar cambios</Button>
          {sucio && (
            <>
              <span className="text-sm text-fg-muted">Tienes cambios sin guardar</span>
              <Button variant="ghost" size="sm" onClick={() => setBorrador(null)} disabled={guardando}>Descartar</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
