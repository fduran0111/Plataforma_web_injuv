"use client";

import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, Button, Modal } from "@/components/ui";

/** Modal para encuadrar una imagen (arrastrar + zoom) y recortarla con canvas antes de subirla. */
export default function RecortarFoto({
  file,
  onCancel,
  onConfirm,
  titulo = "Ajusta tu foto",
  formato = "image/jpeg",
  aspecto = 1,
  mascara = "circulo",
  anchoSalida = 512,
  anchoMinimo,
  descripcion = "Arrastra para mover la foto y usa el control para acercar o alejar.",
}: {
  file: File | null;
  onCancel: () => void;
  onConfirm: (recorte: File) => void | Promise<void>;
  titulo?: string;
  formato?: "image/jpeg" | "image/png";
  aspecto?: number;
  mascara?: "circulo" | "rect";
  anchoSalida?: number;
  anchoMinimo?: number;
  descripcion?: string;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState({ w: 320, h: Math.round(320 / aspecto) });
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);

  const cover = useCallback((n: { w: number; h: number }, b: { w: number; h: number }) => Math.max(b.w / n.w, b.h / n.h), []);

  const clampPos = useCallback(
    (p: { x: number; y: number }, z: number) => {
      const b = areaRef.current ? { w: areaRef.current.clientWidth, h: areaRef.current.clientHeight } : box;
      if (!nat) return p;
      const s = cover(nat, b) * z;
      return {
        x: Math.min(0, Math.max(b.w - nat.w * s, p.x)),
        y: Math.min(0, Math.max(b.h - nat.h * s, p.y)),
      };
    },
    [nat, box, cover],
  );

  const aplicar = useCallback(
    (p: { x: number; y: number }, z: number) => {
      setPos(clampPos(p, z));
      setZoom(z);
    },
    [clampPos],
  );

  const zoomCentro = useCallback(
    (z: number) => {
      const b = areaRef.current ? { w: areaRef.current.clientWidth, h: areaRef.current.clientHeight } : box;
      const r = z / zoom;
      aplicar({ x: b.w / 2 - (b.w / 2 - pos.x) * r, y: b.h / 2 - (b.h / 2 - pos.y) * r }, z);
    },
    [aplicar, box, pos, zoom],
  );

  // Carga la imagen elegida y centra el encuadre; los setters van en callbacks asíncronos.
  useEffect(() => {
    if (!file) return;
    const u = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const n = { w: img.naturalWidth, h: img.naturalHeight };
      setNat(n);
      setError(false);
      setUrl(u);
      requestAnimationFrame(() => {
        const b = areaRef.current ? { w: areaRef.current.clientWidth, h: areaRef.current.clientHeight } : { w: 320, h: Math.round(320 / aspecto) };
        setBox(b);
        const s = cover(n, b);
        setPos({ x: (b.w - n.w * s) / 2, y: (b.h - n.h * s) / 2 });
        setZoom(1);
      });
    };
    img.onerror = () => setError(true);
    img.src = u;
    return () => {
      img.onload = null;
      img.onerror = null;
      URL.revokeObjectURL(u);
    };
  }, [file, cover, aspecto]);

  // Medida real del área (incl. resize).
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const b = { w: el.clientWidth, h: el.clientHeight };
      setBox(b);
      setPos((p) => {
        if (!nat) return p;
        const s = cover(nat, b) * zoom;
        return { x: Math.min(0, Math.max(b.w - nat.w * s, p.x)), y: Math.min(0, Math.max(b.h - nat.h * s, p.y)) };
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [nat, zoom, cover]);

  // Rueda = zoom (listener no pasivo para poder preventDefault)
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomCentro(Math.min(3, Math.max(1, zoom - e.deltaY * 0.002)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, zoomCentro]);

  const down = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
  };
  const move = (e: React.PointerEvent) => {
    if (!drag.current) return;
    aplicar({ x: drag.current.ox + (e.clientX - drag.current.x), y: drag.current.oy + (e.clientY - drag.current.y) }, zoom);
  };
  const up = () => (drag.current = null);

  const teclas = (e: React.KeyboardEvent) => {
    const paso = 10;
    if (e.key === "ArrowLeft") aplicar({ x: pos.x - paso, y: pos.y }, zoom);
    else if (e.key === "ArrowRight") aplicar({ x: pos.x + paso, y: pos.y }, zoom);
    else if (e.key === "ArrowUp") aplicar({ x: pos.x, y: pos.y - paso }, zoom);
    else if (e.key === "ArrowDown") aplicar({ x: pos.x, y: pos.y + paso }, zoom);
    else if (e.key === "+" || e.key === "=") zoomCentro(Math.min(3, zoom + 0.1));
    else if (e.key === "-") zoomCentro(Math.max(1, zoom - 0.1));
    else return;
    e.preventDefault();
  };

  async function confirmar() {
    const img = imgRef.current;
    if (!img || !nat) return;
    setBusy(true);
    try {
      const s = cover(nat, box) * zoom;
      const sx = -pos.x / s;
      const sy = -pos.y / s;
      const sw = box.w / s;
      const sh = box.h / s;
      const ancho = Math.min(anchoSalida, Math.round(sw));
      const alto = Math.round(ancho / aspecto);
      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext("2d")!;
      if (formato === "image/jpeg") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, ancho, alto);
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ancho, alto);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, formato, formato === "image/jpeg" ? 0.85 : undefined));
      if (!blob) throw new Error("No se pudo generar la imagen");
      const base = (file?.name ?? "foto").replace(/\.[^.]+$/, "");
      const ext = formato === "image/png" ? ".png" : ".jpg";
      await onConfirm(new File([blob], base + ext, { type: formato }));
    } finally {
      setBusy(false);
    }
  }

  const s = nat ? cover(nat, box) * zoom : 1;
  const anchoFinal = nat ? Math.min(anchoSalida, Math.round(box.w / s)) : 0;
  const bajaResolucion = !!anchoMinimo && !!nat && anchoFinal < anchoMinimo;

  // Portal al body: el modal puede quedar dentro de ancestros con transform (fijo roto si no).
  if (!file) return null;
  return createPortal(
    <Modal
      open={!!file}
      onClose={onCancel}
      title={titulo}
      description={descripcion}
      size={aspecto > 1 ? "lg" : "md"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={confirmar} loading={busy} disabled={!nat || error}>
            Usar foto
          </Button>
        </div>
      }
    >
      {error ? (
        <Alert tone="red">No pudimos leer esta imagen. Prueba con un JPG o PNG.</Alert>
      ) : (
        <div className="space-y-4">
          <div
            ref={areaRef}
            tabIndex={0}
            role="application"
            aria-label="Área de encuadre, usa las flechas para mover"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onKeyDown={teclas}
            style={{ aspectRatio: aspecto }}
            className={`relative mx-auto w-full cursor-grab touch-none select-none overflow-hidden bg-tinta outline-ambar outline-offset-2 focus-visible:outline-2 active:cursor-grabbing ${aspecto === 1 ? "max-w-[320px]" : "max-w-[560px]"}`}
          >
            {url && (
              // eslint-disable-next-line @next/next/no-img-element -- vista previa local del archivo elegido
              <img
                ref={imgRef}
                src={url}
                alt=""
                draggable={false}
                className="absolute left-0 top-0 max-w-none"
                style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${s})`, transformOrigin: "0 0" }}
              />
            )}
            {mascara === "circulo" ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-papel/80"
                style={{ boxShadow: "0 0 0 9999px rgb(15 27 45 / 0.6)" }}
              />
            ) : (
              <div aria-hidden className="pointer-events-none absolute inset-0 ring-2 ring-inset ring-papel/80">
                <div className="absolute bottom-0 top-0 w-px bg-papel/25" style={{ left: "33.333%" }} />
                <div className="absolute bottom-0 top-0 w-px bg-papel/25" style={{ left: "66.666%" }} />
                <div className="absolute left-0 right-0 h-px bg-papel/25" style={{ top: "33.333%" }} />
                <div className="absolute left-0 right-0 h-px bg-papel/25" style={{ top: "66.666%" }} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ZoomOut className="h-4 w-4 shrink-0 text-fg-muted" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              aria-label="Zoom"
              onChange={(e) => zoomCentro(Number(e.target.value))}
              className="w-full accent-brand"
            />
            <ZoomIn className="h-4 w-4 shrink-0 text-fg-muted" />
            <Button variant="ghost" size="sm" onClick={() => nat && aplicar({ x: (box.w - nat.w * cover(nat, box)) / 2, y: (box.h - nat.h * cover(nat, box)) / 2 }, 1)}>
              <RotateCcw className="h-4 w-4" /> Restablecer
            </Button>
          </div>
          {bajaResolucion && (
            <p role="status" className="rounded-xl bg-ambar/20 px-3.5 py-2.5 text-sm text-fg">
              Así la foto quedará de {anchoFinal} px de ancho y puede verse borrosa. Se recomiendan al menos {anchoMinimo} px: aleja el zoom o usa una foto más grande.
            </p>
          )}
        </div>
      )}
    </Modal>,
    document.body,
  );
}
