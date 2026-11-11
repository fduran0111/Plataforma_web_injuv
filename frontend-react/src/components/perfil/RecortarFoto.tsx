"use client";

import { RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Alert, Button, Modal } from "@/components/ui";

/** Modal para encuadrar una imagen (arrastrar + zoom) y recortarla a 512×512 con canvas antes de subirla. */
export default function RecortarFoto({
  file,
  onCancel,
  onConfirm,
  titulo = "Ajusta tu foto",
  formato = "image/jpeg",
}: {
  file: File | null;
  onCancel: () => void;
  onConfirm: (recorte: File) => void | Promise<void>;
  titulo?: string;
  formato?: "image/jpeg" | "image/png";
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState(320);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);

  const cover = useCallback((n: { w: number; h: number }, b: number) => Math.max(b / n.w, b / n.h), []);

  const clampPos = useCallback(
    (p: { x: number; y: number }, z: number) => {
      const b = areaRef.current?.clientWidth ?? box;
      if (!nat) return p;
      const s = cover(nat, b) * z;
      return {
        x: Math.min(0, Math.max(b - nat.w * s, p.x)),
        y: Math.min(0, Math.max(b - nat.h * s, p.y)),
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
      const c = (areaRef.current?.clientWidth ?? box) / 2;
      const r = z / zoom;
      aplicar({ x: c - (c - pos.x) * r, y: c - (c - pos.y) * r }, z);
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
        const b = areaRef.current?.clientWidth ?? 320;
        setBox(b);
        const s = cover(n, b);
        setPos({ x: (b - n.w * s) / 2, y: (b - n.h * s) / 2 });
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
  }, [file, cover]);

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
      const sw = box / s;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 512;
      const ctx = canvas.getContext("2d")!;
      if (formato === "image/jpeg") {
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, 512, 512);
      }
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, sx, sy, sw, sw, 0, 0, 512, 512);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, formato, 0.9));
      if (!blob) throw new Error("No se pudo generar la imagen");
      const base = (file?.name ?? "foto").replace(/\.[^.]+$/, "");
      const ext = formato === "image/png" ? ".png" : ".jpg";
      await onConfirm(new File([blob], base + ext, { type: formato }));
    } finally {
      setBusy(false);
    }
  }

  const s = nat ? cover(nat, box) * zoom : 1;

  // Portal al body: el modal puede quedar dentro de ancestros con transform (fijo roto si no).
  if (!file) return null;
  return createPortal(
    <Modal
      open={!!file}
      onClose={onCancel}
      title={titulo}
      description="Arrastra para mover la foto y usa el control para acercar o alejar."
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
            className="relative mx-auto aspect-square w-full max-w-[320px] cursor-grab touch-none select-none overflow-hidden bg-tinta outline-ambar outline-offset-2 focus-visible:outline-2 active:cursor-grabbing"
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
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-papel/80"
              style={{ boxShadow: "0 0 0 9999px rgb(15 27 45 / 0.6)" }}
            />
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
            <Button variant="ghost" size="sm" onClick={() => nat && aplicar({ x: (box - nat.w * cover(nat, box)) / 2, y: (box - nat.h * cover(nat, box)) / 2 }, 1)}>
              <RotateCcw className="h-4 w-4" /> Restablecer
            </Button>
          </div>
        </div>
      )}
    </Modal>,
    document.body,
  );
}
