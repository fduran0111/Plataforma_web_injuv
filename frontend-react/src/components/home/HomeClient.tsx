"use client";

import {
  Accessibility,
  ArrowRight,
  Award,
  Baby,
  BookOpen,
  Building2,
  Drama,
  GraduationCap,
  HandHeart,
  HandHelping,
  HeartHandshake,
  HeartPulse,
  Laptop,
  Leaf,
  Palette,
  PawPrint,
  Search,
  Send,
  Siren,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
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
import { AREAS_VOLUNTARIADO, REGIONES } from "@/lib/constants";
import { cn } from "@/lib/format";
import type { Noticia, Oportunidad, PortadaPublica, ResenaPublica } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";

type Stats = { voluntarios: number; organizaciones: number; oportunidades: number; horas: number };

const PASOS = [
  { icon: UserPlus, title: "Crea tu perfil", text: "Regístrate gratis con tu RUT y completa tus datos de contacto." },
  { icon: Search, title: "Encuentra tu causa", text: "Filtra por región y área: educación, medio ambiente, salud y más." },
  { icon: Send, title: "Postula", text: "Envía tu postulación en un clic y sigue su estado desde tu perfil." },
  { icon: Award, title: "Certifica tu experiencia", text: "Registra tus horas y recibe el certificado de la organización." },
];

const ICONO_AREA: Record<string, typeof UserPlus> = {
  Educación: GraduationCap,
  Comunidad: Users,
  "Medio Ambiente": Leaf,
  Salud: HeartPulse,
  Deporte: Trophy,
  Cultura: Drama,
  Emergencia: Siren,
  "Desarrollo Social": HandHeart,
  Tecnología: Laptop,
  Arte: Palette,
  Animales: PawPrint,
  "Adultos Mayores": HandHelping,
  "Niños y Jóvenes": Baby,
  Discapacidad: Accessibility,
};

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

export default function HomeClient({ portada }: { portada: PortadaPublica | null }) {
  const router = useRouter();
  const { user } = useAuth();
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const stats = useApi<Stats>("/public/estadisticas");
  const oportunidades = useApi<Oportunidad[]>("/oportunidades?limit=6");
  const noticias = useApi<Noticia[]>("/noticias?limit=3");
  const resenas = useApi<ResenaPublica[]>("/public/resenas?limite=3");
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
  const moverFila = (dir: 1 | -1) => {
    const el = filaRef.current;
    const card = el?.querySelector<HTMLElement>("a, .animate-pulse");
    if (!el) return;
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 400) + 20), behavior: "smooth" });
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 lg:mr-[min(0px,40rem-50vw)]">
          <Stagger stagger={0.07}>
            <div
              ref={filaRef}
              onScroll={refrescarFlechas}
              className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-pl-4 pb-6 lg:scroll-pl-8 [scrollbar-color:var(--tinta)_transparent]"
            >
              {oportunidades.loading && !oportunidades.data
                ? Array.from({ length: 3 }, (_, i) => (
                    <StaggerItem key={i} className="w-[85vw] shrink-0 snap-start sm:w-[400px]">
                      <OportunidadCardSkeleton />
                    </StaggerItem>
                  ))
                : (oportunidades.data ?? []).map((op) => (
                    <StaggerItem key={op.id} className="w-[85vw] shrink-0 snap-start sm:w-[400px]">
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
      <section className="bg-papel-strong py-24 lg:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionTitle eyebrow="Explora por área" title="¿Qué causa te mueve?" highlight="te mueve" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
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
        <section className="bg-brand py-24 text-white lg:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle eyebrow="Experiencias" title="Lo que dicen nuestros voluntarios" highlight="voluntarios" inverse />
            <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
              <figure className="relative lg:col-span-7">
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
                      {resenas.data[0].oportunidad_titulo} · {resenas.data[0].organizacion_nombre}
                    </p>
                  </div>
                </figcaption>
              </figure>
              <Stagger className="mt-12 space-y-5 lg:col-span-4 lg:col-start-9 lg:mt-0">
                {resenas.data.slice(1).map((r) => (
                  <StaggerItem key={r.postulacion_id} className="h-full">
                    <ResenaCard r={r} />
                  </StaggerItem>
                ))}
              </Stagger>
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
          <Stagger className="grid gap-5 lg:grid-cols-12">
            {noticias.data.map((n, i) => (
              <StaggerItem key={n.id} className={cn("h-full", i === 0 ? "lg:col-span-7 lg:row-span-2" : "lg:col-span-5")}>
                <NoticiaCard n={n} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* Recursos + organizaciones */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
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
      </section>
    </>
  );
}
