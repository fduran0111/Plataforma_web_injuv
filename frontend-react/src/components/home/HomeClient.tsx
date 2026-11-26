"use client";

import { ArrowRight, Award, BookOpen, Building2, GraduationCap, HeartHandshake, Search, Send, UserPlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { animate, type AnimationPlaybackControls } from "motion";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NoticiaCard, ResenaCard } from "@/components/ContentCards";
import AreaTile from "@/components/home/AreaTile";
import GaleriaFotos from "@/components/home/GaleriaFotos";
import RecursoCard, { type Recurso } from "@/components/home/RecursoCard";
import InkFill from "@/components/home/InkFill";
import RevealText from "@/components/home/RevealText";
import RollingNumber from "@/components/home/RollingNumber";
import { Stagger, StaggerItem } from "@/components/home/Stagger";
import OportunidadCard, { OportunidadCardSkeleton } from "@/components/oportunidades/OportunidadCard";
import { Avatar, Button, LinkButton, Select, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useOportunidadesPostuladas } from "@/hooks/useMisPostulaciones";
import { fileUrl } from "@/lib/api";
import { ICONO_AREA } from "@/lib/areas";
import { AREAS_VOLUNTARIADO, REGIONES } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { Noticia, Oportunidad, PortadaPublica, ResenaPublica } from "@/lib/types";
import { useReducedMotion } from "@/lib/motion";
import { useAuth } from "@/providers/AuthProvider";

type Stats = { voluntarios: number; organizaciones: number; oportunidades: number; horas: number };

const PASOS = [
  { icon: UserPlus, title: "Crea tu perfil", text: "Regístrate gratis con tu RUT y completa tus datos de contacto." },
  { icon: Search, title: "Encuentra tu causa", text: "Filtra por región y área: educación, medio ambiente, salud y más." },
  { icon: Send, title: "Postula", text: "Envía tu postulación en un clic y sigue su estado desde tu perfil." },
  { icon: Award, title: "Certifica tu experiencia", text: "Registra tus horas y recibe el certificado de la organización." },
];

const TITULO_H2 = "text-[clamp(2.5rem,1.4rem+3.6vw,4.75rem)] leading-[0.98] tracking-[-0.03em]";

function SectionTitle({
  eyebrow,
  title,
  highlight,
  action,
  inverse,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  action?: React.ReactNode;
  inverse?: boolean;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-6 lg:mb-12">
      <div>
        <RevealText
          as="h2"
          text={title}
          highlight={highlight}
          highlightClassName={inverse ? "text-ambar" : "marcador-ambar"}
          className={cn(TITULO_H2, "max-w-[18ch]", inverse ? "text-white" : "text-fg")}
        />
        <p className={cn("mt-4 inline-flex items-center gap-3 text-base font-semibold", inverse ? "text-white/80" : "text-fg-muted")}>
          <span className="h-[3px] w-6 rounded-full bg-ambar" aria-hidden />
          {eyebrow}
        </p>
      </div>
      {action}
    </div>
  );
}

/** Tarjetas de reseñas de a dos: cambian solas con un fundido lento; se pausan con el mouse encima o si la pestaña no se ve. */
function ResenasRotativas({ resenas }: { resenas: ResenaPublica[] }) {
  const reduced = useReducedMotion();
  const [activa, setActiva] = useState(0);
  const [pausa, setPausa] = useState(false);
  const grupos: ResenaPublica[][] = [];
  for (let i = 0; i < resenas.length; i += 2) grupos.push(resenas.slice(i, i + 2));
  const total = grupos.length;

  useEffect(() => {
    if (total < 2 || pausa || reduced) return;
    const id = window.setInterval(() => {
      if (!document.hidden) setActiva((i) => (i + 1) % total);
    }, 5000);
    return () => window.clearInterval(id);
  }, [total, pausa, reduced]);

  return (
    <div className="grid" aria-live="polite" onPointerEnter={() => setPausa(true)} onPointerLeave={() => setPausa(false)}>
      {grupos.map((g, i) => (
        <div
          key={g[0].postulacion_id}
          aria-hidden={i !== activa}
          className={cn(
            "flex flex-col gap-5 [grid-area:1/1] transition-opacity ease-[cubic-bezier(0.65,0,0.35,1)] motion-reduce:transition-none",
            i === activa ? "opacity-100 delay-[700ms] duration-[1000ms]" : "pointer-events-none opacity-0 duration-[700ms]",
          )}
        >
          {g.map((r) => (
            <ResenaCard key={r.postulacion_id} r={r} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function HomeClient({ portada }: { portada: PortadaPublica | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const stats = useApi<Stats>("/public/estadisticas");
  const oportunidades = useApi<Oportunidad[]>("/oportunidades?limit=6");
  const noticias = useApi<Noticia[]>("/noticias?limit=3");
  const resenas = useApi<ResenaPublica[]>("/public/resenas?limite=11");
  const postuladas = useOportunidadesPostuladas();

  // Carrusel de voluntariados
  const filaRef = useRef<HTMLDivElement>(null);
  const [puedeAnt, setPuedeAnt] = useState(false);
  const [puedeSig, setPuedeSig] = useState(true);
  const refrescarFlechas = () => {
    const el = filaRef.current;
    if (!el) return;
    setPuedeAnt(el.scrollLeft > 8);
    setPuedeSig(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };
  const animFila = useRef<AnimationPlaybackControls | null>(null);
  /** Avanza una "página" de tarjetas visibles, alineando exacto al borde de la tarjeta destino. */
  const moverFila = (dir: 1 | -1) => {
    const el = filaRef.current;
    if (!el) return;
    const items = [...el.children] as HTMLElement[];
    if (!items.length) return;
    const pad = parseFloat(getComputedStyle(el).paddingLeft) || 0;
    const paso = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : items[0].offsetWidth;
    const visibles = Math.max(1, Math.floor((el.clientWidth - pad * 2 + 20) / paso));
    const actual = Math.round(el.scrollLeft / paso);
    const destino = Math.min(Math.max(actual + dir * visibles, 0), Math.max(items.length - visibles, 0));
    const max = el.scrollWidth - el.clientWidth;
    const objetivo = Math.min(items[destino].offsetLeft - items[0].offsetLeft, max);
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    animFila.current?.stop();
    el.style.scrollSnapType = "none";
    animFila.current = animate(el.scrollLeft, objetivo, {
      duration: reducir ? 0 : 0.7,
      ease: [0.77, 0, 0.175, 1],
      onUpdate: (v) => (el.scrollLeft = v),
      onComplete: () => {
        el.style.scrollSnapType = "";
        refrescarFlechas();
      },
    });
    if (reducir) return;
    items.slice(destino, destino + visibles).forEach((it, i) =>
      it.animate(
        [
          { transform: `translateX(${dir * 48}px)`, opacity: 0.35 },
          { transform: "translateX(0)", opacity: 1 },
        ],
        { duration: 650, delay: 120 + i * 70, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "backwards" },
      ),
    );
  };

  /** Arrastre con mouse (en táctil ya desliza nativo): sigue al puntero y al soltar se asienta en la tarjeta más cercana. */
  const arrastre = useRef<{ x: number; scroll: number; t: number; v: number; movio: boolean } | null>(null);
  const alSoltarClick = useRef(false);
  const empezarArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = filaRef.current;
    if (!el) return;
    animFila.current?.stop();
    arrastre.current = { x: e.clientX, scroll: el.scrollLeft, t: e.timeStamp, v: 0, movio: false };
  };
  const moverArrastre = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current;
    const el = filaRef.current;
    if (!a || !el) return;
    const dx = e.clientX - a.x;
    if (!a.movio && Math.abs(dx) < 6) return;
    if (!a.movio) {
      a.movio = true;
      el.setPointerCapture(e.pointerId);
      el.style.scrollSnapType = "none";
      el.style.cursor = "grabbing";
    }
    const anterior = el.scrollLeft;
    el.scrollLeft = a.scroll - dx;
    const dt = Math.max(e.timeStamp - a.t, 1);
    a.v = (el.scrollLeft - anterior) / dt;
    a.t = e.timeStamp;
  };
  const terminarArrastre = () => {
    const a = arrastre.current;
    const el = filaRef.current;
    arrastre.current = null;
    if (!a?.movio || !el) return;
    alSoltarClick.current = true;
    setTimeout(() => (alSoltarClick.current = false), 0);
    el.style.cursor = "";
    const items = [...el.children] as HTMLElement[];
    const paso = items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : el.clientWidth;
    const proyectado = el.scrollLeft + a.v * 180;
    const max = el.scrollWidth - el.clientWidth;
    const objetivo = Math.min(Math.max(Math.round(proyectado / paso) * paso, 0), max);
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    animFila.current = animate(el.scrollLeft, objetivo, {
      duration: reducir ? 0 : 0.45,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => (el.scrollLeft = v),
      onComplete: () => {
        el.style.scrollSnapType = "";
        refrescarFlechas();
      },
    });
  };

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (area) params.set("area", area);
    router.push(`/oportunidades${params.size ? `?${params}` : ""}`);
  }

  const cfg = portada?.config;
  const fotosInicio = (portada?.fotos.inicio ?? []).slice(0, 7).map((f) => ({ src: fileUrl.portada(f.archivo), alt: f.alt }));
  const linea2 = (cfg?.titulo_linea2 ?? "que").trim();
  const aviso = cfg?.aviso_activo && cfg.aviso_texto ? { texto: cfg.aviso_texto, enlace: cfg.aviso_enlace } : null;

  return (
    <>
      {aviso && (
        <div className="bg-ambar text-tinta">
          <p className="mx-auto flex max-w-7xl items-center justify-center gap-3 px-4 py-2.5 text-center text-sm font-semibold sm:px-6 lg:px-8">
            {aviso.texto}
            {aviso.enlace &&
              (aviso.enlace.startsWith("http") ? (
                <a href={aviso.enlace} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                  Ver más <ArrowRight className="h-3.5 w-3.5" />
                </a>
              ) : (
                <Link href={aviso.enlace} className="inline-flex items-center gap-1 underline underline-offset-2">
                  Ver más <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ))}
          </p>
        </div>
      )}
      {/* Portada: crossfade lento de fotos */}
      <section id="portada" className={cn("relative min-h-[600px] overflow-clip bg-tinta text-papel", aviso ? "h-[calc(100svh-68px-2.75rem)]" : "h-[calc(100svh-68px)]")}>
        <div className="absolute inset-0" aria-hidden>
          <div className="absolute inset-0">
            {fotosInicio.map((foto, i) => (
              <div key={i} className="foto-ciclo absolute inset-0">
                <Image
                  src={foto.src}
                  alt={foto.alt}
                  fill
                  priority={i === 0}
                  unoptimized
                  sizes="100vw"
                  className="kb object-cover"
                />
              </div>
            ))}
            <div className="absolute inset-0 bg-tinta/60" />
          </div>
        </div>
        <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-10 sm:px-6 lg:px-8 lg:pb-14">
          <p className="inline-flex w-fit items-center gap-2 rounded-full bg-tinta/55 px-3 py-1.5 text-sm font-semibold text-papel">
            <HeartHandshake className="h-4 w-4" /> {cfg?.etiqueta ?? "Programa nacional de voluntariado juvenil"}
          </p>
          <h1 className="mt-6 font-display text-[clamp(3rem,1rem+7vw,8.5rem)] leading-[0.92] tracking-[-0.035em] text-papel max-sm:text-[2.35rem]">
            <span className="linea">
              <span>{cfg?.titulo_linea1 ?? "Súmate a las causas"}</span>
            </span>
            <span className="linea">
              <span>
                {linea2 && <>{linea2} </>}
                <span className="text-ambar">{cfg?.titulo_resaltado ?? "mueven a Chile"}</span>
              </span>
            </span>
          </h1>
          <div className="hero-sigue">
            <p className="mt-6 max-w-[48ch] text-lg text-papel/85 sm:text-xl">
              {cfg?.subtitulo ?? "Encuentra voluntariados cerca de ti, postula en minutos y certifica tu experiencia con organizaciones de todo el país."}
            </p>
            <form
              onSubmit={buscar}
              className="mt-9 grid max-w-3xl gap-2 rounded-2xl bg-papel p-2 shadow-[0_30px_70px_-25px_rgb(0_0_0/0.6)] sm:grid-cols-[1fr_1fr_auto]"
            >
              <Select className="select-vivo" aria-label="Región" value={region} onChange={(e) => setRegion(e.target.value)} options={REGIONES} placeholder="Todas las regiones" />
              <Select className="select-vivo" aria-label="Área" value={area} onChange={(e) => setArea(e.target.value)} options={AREAS_VOLUNTARIADO} placeholder="Todas las áreas" />
              <Button type="submit" size="lg" className="h-12">
                <Search className="h-4 w-4" /> Buscar
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Carrusel de fotos del programa */}
      {!!portada?.fotos.galeria.length && (
        <GaleriaFotos titulo="Así se vive el voluntariado" destacado="voluntariado" etiqueta="Galería" fotos={portada.fotos.galeria.map((f) => ({ src: fileUrl.portada(f.archivo), alt: f.alt }))} />
      )}

      {/* Cifras */}
      {(stats.loading || stats.data) && (
      <section className="bg-brand text-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          {stats.loading && !stats.data && <span className="sr-only">Cargando cifras</span>}
          <Stagger className="grid grid-cols-2 gap-x-8 gap-y-8 lg:grid-cols-4 lg:gap-x-12">
            {[
              { label: "Voluntarios registrados", value: stats.data?.voluntarios },
              { label: "Organizaciones", value: stats.data?.organizaciones },
              { label: "Voluntariados creados", value: stats.data?.oportunidades },
              { label: "Horas de voluntariado", value: stats.data?.horas },
            ].map(({ label, value }) => (
              <StaggerItem key={label}>
                <p className="font-display text-[clamp(3rem,2rem+4vw,6.5rem)] leading-none text-white">
                  {value === undefined ? (
                    <span aria-hidden className="inline-block h-[0.8em] w-[1.6ch] animate-pulse rounded-lg bg-white/20 align-middle" />
                  ) : (
                    <RollingNumber value={value} />
                  )}
                </p>
                <p className="mt-4 text-base text-white/85">{label}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>
      )}

      {/* Voluntariados */}
      {(oportunidades.loading || !!oportunidades.data?.length) && (
      <section className="overflow-x-clip py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle
            eyebrow="Oportunidades"
            title="Voluntariados abiertos"
            highlight="abiertos"
            action={
              <div className="flex items-center gap-2">
                {!!oportunidades.data?.length && (
                <>
                <button
                  type="button"
                  aria-label="Anterior"
                  disabled={!puedeAnt}
                  onClick={() => moverFila(-1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-tinta bg-surface text-tinta transition-colors duration-200 enabled:hover:bg-tinta enabled:hover:text-papel disabled:opacity-35"
                >
                  <ArrowRight className="h-4 w-4 rotate-180" />
                </button>
                <button
                  type="button"
                  aria-label="Siguiente"
                  disabled={!puedeSig}
                  onClick={() => moverFila(1)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border-[1.5px] border-tinta bg-surface text-tinta transition-colors duration-200 enabled:hover:bg-tinta enabled:hover:text-papel disabled:opacity-35"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
                </>
                )}
                <LinkButton href="/oportunidades" variant="outline" className="ml-2">
                  Ver todas <ArrowRight className="h-4 w-4" />
                </LinkButton>
              </div>
            }
          />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Stagger key={oportunidades.data ? "datos" : "cargando"} stagger={0.07}>
            <div
              ref={filaRef}
              onScroll={refrescarFlechas}
              onPointerDown={empezarArrastre}
              onPointerMove={moverArrastre}
              onPointerUp={terminarArrastre}
              onPointerCancel={terminarArrastre}
              onDragStart={(e) => e.preventDefault()}
              onClickCapture={(e) => {
                if (!alSoltarClick.current) return;
                alSoltarClick.current = false;
                e.preventDefault();
                e.stopPropagation();
              }}
              className="fila-tarjetas relative flex cursor-grab select-none snap-x snap-mandatory gap-5 overflow-x-auto scroll-pl-2 -mx-2 px-2 -mt-4 pt-4 pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {oportunidades.loading && !oportunidades.data
                ? Array.from({ length: 3 }, (_, i) => (
                    <StaggerItem key={i} className="w-[85vw] shrink-0 snap-start sm:w-[400px] lg:w-[calc((100%-2.5rem)/3)]">
                      <OportunidadCardSkeleton />
                    </StaggerItem>
                  ))
                : (oportunidades.data ?? []).map((op) => (
                    <StaggerItem key={op.id} className="w-[85vw] shrink-0 snap-start sm:w-[400px] lg:w-[calc((100%-2.5rem)/3)]">
                      <OportunidadCard op={op} postulado={postuladas.has(op.id)} />
                    </StaggerItem>
                  ))}
            </div>
          </Stagger>
        </div>
      </section>
      )}

      {/* Cómo funciona */}
      <section id="pasos" className="bg-tinta py-24 text-papel lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-y-16 px-4 sm:px-6 lg:grid-cols-12 lg:gap-x-8 lg:px-8">
          <div className="lg:col-span-5">
            <RevealText
              as="h2"
              text="Tu voluntariado en cuatro pasos"
              highlight="cuatro pasos"
              className="max-w-[14ch] text-[clamp(2.5rem,1.6rem+2.6vw,4rem)] leading-[0.98] tracking-[-0.03em] text-white"
            />
            <p className="mt-4 inline-flex items-center gap-3 text-base font-semibold text-papel/80">
              <span className="h-[3px] w-6 rounded-full bg-ambar" aria-hidden />
              ¿Cómo funciona?
            </p>
            {!user && (
              <div>
                <LinkButton href="/login" variant="secondary" size="lg" className="mt-10">
                  Iniciar sesión <ArrowRight className="h-4 w-4" />
                </LinkButton>
              </div>
            )}
          </div>
          <Stagger className="lg:col-span-6 lg:col-start-7 lg:self-center" stagger={0.08}>
            <ol className="grid gap-x-8 sm:grid-cols-2">
              {PASOS.map(({ icon: Icon, title, text }, i) => (
                <li key={title}>
                  <StaggerItem className="h-full border-t border-papel/20 pb-10 pt-6">
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[clamp(3rem,2.4rem+2vw,4.5rem)] leading-none tabular-nums text-ambar">{i + 1}</span>
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-papel/10 text-papel" aria-hidden>
                        <Icon className="h-5 w-5" />
                      </span>
                    </div>
                    <h3 className="mt-6 text-h3 text-white">{title}</h3>
                    <p className="mt-2 max-w-[34ch] text-base text-papel/80">{text}</p>
                  </StaggerItem>
                </li>
              ))}
            </ol>
          </Stagger>
        </div>
      </section>

      {/* Áreas: mosaico de causas con ícono */}
      <section className="bg-papel-strong py-20 lg:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle eyebrow="Explora por área" title="¿Qué causa te mueve?" highlight="te mueve" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {AREAS_VOLUNTARIADO.map((a, i) => {
              const ultima = i === AREAS_VOLUNTARIADO.length - 1;
              return (
                <AreaTile
                  key={a}
                  area={a}
                  index={i}
                  href={`/oportunidades?area=${encodeURIComponent(a)}`}
                  Icon={ICONO_AREA[a] ?? HeartHandshake}
                  ancho={i === 0 || ultima}
                  tono={i === 0 ? "azul" : ultima ? "tinta" : "claro"}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* Reseñas */}
      {!!resenas.data?.length && (
        <section className="bg-tinta py-20 text-white lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-8">
              <div className="lg:col-span-7">
              <SectionTitle eyebrow="Experiencias" title="Lo que dicen nuestros voluntarios" highlight="voluntarios" inverse />
              <figure className="relative">
                <span aria-hidden className="absolute -left-4 -top-8 font-display text-[6rem] leading-none text-ambar lg:-left-8">
                  “
                </span>
                <blockquote className="font-display text-[clamp(1.75rem,1.1rem+2.2vw,2.75rem)] leading-[1.12] max-w-[30ch]">
                  <InkFill text={resenas.data[0].resena} />
                </blockquote>
                <figcaption className="mt-8 flex items-center gap-3">
                  <Avatar name={resenas.data[0].usuario_nombre} src={resenas.data[0].usuario_tiene_foto ? fileUrl.foto(resenas.data[0].usuario_id) : null} size={44} />
                  <div className="min-w-0">
                    <Stars value={resenas.data[0].calificacion} />
                    <p className="truncate font-semibold text-white">{resenas.data[0].usuario_nombre}</p>
                    <p className="truncate text-sm text-white/75">
                      Para{" "}
                      <Link href={`/organizaciones/${resenas.data[0].organizacion_id}`} className="font-semibold text-ambar hover:underline">
                        {resenas.data[0].organizacion_nombre}
                      </Link>{" "}
                      · {resenas.data[0].oportunidad_titulo}
                    </p>
                  </div>
                </figcaption>
              </figure>
              </div>
              {resenas.data.length > 1 && (
                <div className="mt-12 lg:col-span-4 lg:col-start-9 lg:mt-0">
                  <ResenasRotativas resenas={resenas.data.slice(1)} />
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Noticias */}
      {!!noticias.data?.length && (
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <SectionTitle
            eyebrow="Noticias"
            title="Lo último en voluntariado"
            highlight="voluntariado"
            action={
              <LinkButton href="/noticias" variant="outline">
                Ver noticias <ArrowRight className="h-4 w-4" />
              </LinkButton>
            }
          />
          <Stagger className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6" stagger={0.08}>
            {noticias.data.map((n) => (
              <StaggerItem key={n.id} className="h-full">
                <NoticiaCard n={n} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Recursos + organizaciones: franja beige (como "¿Qué causa te mueve?") para separarla de las noticias */}
      <section className="bg-papel-strong">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <SectionTitle eyebrow="Recursos" title="Aprende y súmate" highlight="súmate" />
        <Stagger className="grid gap-5 md:grid-cols-3 lg:gap-8" stagger={0}>
          {(
            [
            {
              href: "/academia",
              icon: GraduationCap,
              title: "Academia de voluntariado",
              text: "Guías, plantillas y videos para prepararte antes de participar.",
              cta: "Explorar",
              card: "bg-brand text-white focus-visible:outline-brand",
              chip: "bg-white/15 text-white",
              body: "text-white/85",
              go: "bg-white text-brand",
            },
            {
              href: "/biblioteca",
              icon: BookOpen,
              title: "Biblioteca y estudios",
              text: "Investigaciones y documentos sobre juventud y participación.",
              cta: "Ver documentos",
              card: "bg-ambar text-tinta focus-visible:outline-tinta",
              chip: "bg-tinta/10 text-tinta",
              body: "text-tinta/80",
              go: "bg-tinta text-ambar",
            },
            {
              href: "/perfil/solicitud-organizacion",
              icon: Building2,
              title: "¿Eres una organización?",
              text: "Publica voluntariados, gestiona postulantes y certifica a tus voluntarios.",
              cta: "Registrar organización",
              card: "bg-tinta text-papel focus-visible:outline-tinta",
              chip: "bg-papel/10 text-ambar",
              body: "text-papel/80",
              go: "bg-ambar text-tinta",
            },
            ] satisfies Recurso[]
          ).map((r, i) => (
            <RecursoCard key={r.href} r={r} index={i} />
          ))}
        </Stagger>
        </div>
      </section>
    </>
  );
}
