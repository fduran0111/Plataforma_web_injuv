"use client";

import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  Clock,
  GraduationCap,
  HeartHandshake,
  Search,
  Send,
  UserPlus,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { NoticiaCard, ResenaCard } from "@/components/ContentCards";
import OportunidadCard, { OportunidadCardSkeleton } from "@/components/oportunidades/OportunidadCard";
import { Button, LinkButton, Select } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { useOportunidadesPostuladas } from "@/hooks/useMisPostulaciones";
import { AREAS_VOLUNTARIADO, REGIONES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { Noticia, Oportunidad, ResenaPublica } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import hero from "../../../public/fotos/voluntariado-1.jpg";
import foto3 from "../../../public/fotos/voluntariado-3.jpg";
import foto4 from "../../../public/fotos/voluntariado-4.jpg";

type Stats = { voluntarios: number; organizaciones: number; oportunidades: number; horas: number };

const PASOS = [
  { icon: UserPlus, title: "Crea tu perfil", text: "Regístrate gratis con tu RUT y completa tus datos de contacto." },
  { icon: Search, title: "Encuentra tu causa", text: "Filtra por región y área: educación, medio ambiente, salud y más." },
  { icon: Send, title: "Postula", text: "Envía tu postulación en un clic y sigue su estado desde tu perfil." },
  { icon: Award, title: "Certifica tu experiencia", text: "Registra tus horas y recibe el certificado de la organización." },
];

function SectionTitle({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-fg">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();
  const [region, setRegion] = useState("");
  const [area, setArea] = useState("");
  const stats = useApi<Stats>("/public/estadisticas");
  const oportunidades = useApi<Oportunidad[]>("/oportunidades?limit=6");
  const noticias = useApi<Noticia[]>("/noticias?limit=3");
  const resenas = useApi<ResenaPublica[]>("/public/resenas?limite=3");
  const postuladas = useOportunidadesPostuladas();

  function buscar(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (region) params.set("region", region);
    if (area) params.set("area", area);
    router.push(`/oportunidades${params.size ? `?${params}` : ""}`);
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-dark">
        <Image src={hero} alt="" fill priority className="object-cover opacity-35" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark via-brand-dark/85 to-brand-dark/30" />
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
              <HeartHandshake className="h-3.5 w-3.5" /> Programa nacional de voluntariado juvenil
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              Súmate a las causas que <span className="text-sky-300">mueven a Chile</span>
            </h1>
            <p className="mt-5 text-lg text-white/80">
              Encuentra voluntariados cerca de ti, postula en minutos y certifica tu experiencia con organizaciones de todo el país.
            </p>
          </div>
          <form onSubmit={buscar} className="mt-10 grid max-w-3xl gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:grid-cols-[1fr_1fr_auto]">
            <Select aria-label="Región" value={region} onChange={(e) => setRegion(e.target.value)} options={REGIONES} placeholder="Todas las regiones" />
            <Select aria-label="Área" value={area} onChange={(e) => setArea(e.target.value)} options={AREAS_VOLUNTARIADO} placeholder="Todas las áreas" />
            <Button type="submit" size="lg" className="h-11">
              <Search className="h-4 w-4" /> Buscar
            </Button>
          </form>
        </div>
      </section>

      {/* Estadísticas */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { icon: Users, label: "Voluntarios registrados", value: stats.data?.voluntarios },
            { icon: Building2, label: "Organizaciones", value: stats.data?.organizaciones },
            { icon: HeartHandshake, label: "Voluntariados creados", value: stats.data?.oportunidades },
            { icon: Clock, label: "Horas de voluntariado", value: stats.data?.horas },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-4">
              <div className="rounded-2xl bg-brand-soft p-3 text-brand">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-fg">{value === undefined ? "—" : formatNumber(value)}</p>
                <p className="text-sm text-fg-muted">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Oportunidades */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle
          eyebrow="Oportunidades"
          title="Voluntariados abiertos"
          action={
            <LinkButton href="/oportunidades" variant="outline">
              Ver todas <ArrowRight className="h-4 w-4" />
            </LinkButton>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {oportunidades.loading && !oportunidades.data
            ? Array.from({ length: 3 }, (_, i) => <OportunidadCardSkeleton key={i} />)
            : (oportunidades.data ?? []).map((op) => <OportunidadCard key={op.id} op={op} postulado={postuladas.has(op.id)} />)}
        </div>
        {oportunidades.data?.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border bg-surface py-12 text-center text-fg-muted">
            Por ahora no hay voluntariados abiertos. ¡Vuelve pronto!
          </p>
        )}
      </section>

      {/* Cómo funciona */}
      <section className="bg-surface py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <SectionTitle eyebrow="¿Cómo funciona?" title="Tu voluntariado en cuatro pasos" />
            <ol className="space-y-6">
              {PASOS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-4">
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/20">
                    <Icon className="h-5 w-5" />
                    <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-[10px] font-bold">
                      {i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-fg">{title}</h3>
                    <p className="mt-1 text-sm text-fg-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
            {!user && (
              <LinkButton href="/registro" size="lg" className="mt-8">
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </LinkButton>
            )}
          </div>
          <div className="relative hidden h-[480px] lg:block">
            <Image src={foto3} alt="Voluntarios trabajando en terreno" className="absolute right-0 top-0 h-80 w-4/5 rounded-3xl object-cover shadow-xl" />
            <Image src={foto4} alt="Jóvenes en una actividad comunitaria" className="absolute bottom-0 left-0 h-64 w-3/5 rounded-3xl object-cover shadow-xl ring-8 ring-surface" />
          </div>
        </div>
      </section>

      {/* Áreas */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Explora por área" title="¿Qué causa te mueve?" />
        <div className="flex flex-wrap gap-2.5">
          {AREAS_VOLUNTARIADO.map((a) => (
            <Link
              key={a}
              href={`/oportunidades?area=${encodeURIComponent(a)}`}
              className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-fg-secondary transition hover:border-brand hover:bg-brand-soft hover:text-brand"
            >
              {a}
            </Link>
          ))}
        </div>
      </section>

      {/* Reseñas */}
      {!!resenas.data?.length && (
        <section className="bg-surface py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle eyebrow="Experiencias" title="Lo que dicen nuestros voluntarios" />
            <div className="grid gap-5 md:grid-cols-3">
              {resenas.data.map((r) => (
                <ResenaCard key={r.postulacion_id} r={r} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Noticias */}
      {!!noticias.data?.length && (
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <SectionTitle
            eyebrow="Noticias"
            title="Lo último en voluntariado"
            action={
              <LinkButton href="/noticias" variant="outline">
                Ver noticias <ArrowRight className="h-4 w-4" />
              </LinkButton>
            }
          />
          <div className="grid gap-5 md:grid-cols-3">
            {noticias.data.map((n) => (
              <NoticiaCard key={n.id} n={n} />
            ))}
          </div>
        </section>
      )}

      {/* Recursos + organizaciones */}
      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-20 sm:px-6 md:grid-cols-3 lg:px-8">
        <Link href="/academia" className="group rounded-3xl bg-violet-600 p-8 text-white transition hover:bg-violet-700">
          <GraduationCap className="h-8 w-8" />
          <h3 className="mt-6 text-xl font-bold">Academia de voluntariado</h3>
          <p className="mt-2 text-sm text-white/80">Guías, plantillas y videos para prepararte antes de participar.</p>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">
            Explorar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
        <Link href="/biblioteca" className="group rounded-3xl bg-sky-600 p-8 text-white transition hover:bg-sky-700">
          <BookOpen className="h-8 w-8" />
          <h3 className="mt-6 text-xl font-bold">Biblioteca y estudios</h3>
          <p className="mt-2 text-sm text-white/80">Investigaciones y documentos sobre juventud y participación.</p>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">
            Ver documentos <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
        <Link href="/perfil/solicitud-organizacion" className="group rounded-3xl bg-slate-900 p-8 text-white transition hover:bg-slate-800">
          <Building2 className="h-8 w-8" />
          <h3 className="mt-6 text-xl font-bold">¿Eres una organización?</h3>
          <p className="mt-2 text-sm text-white/80">Publica voluntariados, gestiona postulantes y certifica a tus voluntarios.</p>
          <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold">
            Registrar organización <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </span>
        </Link>
      </section>
    </>
  );
}
