"use client";

import { Clock, Mail, Phone } from "lucide-react";
import * as m from "motion/react-m";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "@/components/layout/nav";

const LINK = "underline-offset-4 decoration-ambar/0 transition-colors hover:text-papel hover:underline hover:decoration-ambar";
const EASE = [0.23, 1, 0.32, 1] as const;

/** Columnas: aparecen en su lugar (solo opacidad), una tras otra, cuando la franja termina de dibujarse. */
const COLUMNA = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5, ease: EASE } } };

export default function SiteFooter() {
  return (
    <m.footer
      className="mt-auto bg-tinta text-papel/75"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.35 } } }}
    >
      <div className="flex h-1.5" aria-hidden>
        <m.div
          className="w-2/5 origin-left bg-brand"
          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.5, ease: EASE } } }}
        />
        <m.div
          className="w-3/5 origin-left bg-brand-red"
          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.6, ease: EASE, delay: 0.15 } } }}
        />
      </div>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <m.div variants={COLUMNA}>
          <p className="font-display text-h3 text-papel">INJUV Voluntariado</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Conectamos a jóvenes de todo Chile, de Arica a Magallanes, con organizaciones que transforman sus comunidades.
          </p>
        </m.div>
        <m.div variants={COLUMNA}>
          <p className="font-display text-base text-papel">Explora</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={LINK}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </m.div>
        <m.div variants={COLUMNA}>
          <p className="font-display text-base text-papel">Organizaciones</p>
          <ul className="mt-3 space-y-2 text-[15px]">
            <li>
              <Link href="/perfil/solicitud-organizacion" className={LINK}>
                Registrar mi organización
              </Link>
            </li>
            <li>
              <Link href="/organizacion" className={LINK}>
                Panel de organización
              </Link>
            </li>
            <li>
              <Link href="/academia" className={LINK}>
                Recursos de formación
              </Link>
            </li>
          </ul>
        </m.div>
        <m.div variants={COLUMNA}>
          <p className="font-display text-base text-papel">Contacto</p>
          <ul className="mt-3 space-y-2.5 text-[15px]">
            <li className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-ambar" /> Lunes a viernes, 9:00 a 18:00 hrs
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-ambar" />
              <a href="tel:+56226204700" className={LINK}>
                +56 2 2620 4700
              </a>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-ambar" />
              <a href="mailto:voluntariado@injuv.gob.cl" className={LINK}>
                voluntariado@injuv.gob.cl
              </a>
            </li>
          </ul>
        </m.div>
      </div>
      <m.div variants={COLUMNA} className="border-t border-papel/15">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-papel/55">© {new Date().getFullYear()} Instituto Nacional de la Juventud · Gobierno de Chile</p>
          <div className="flex items-center gap-3 rounded-md bg-papel px-4 py-2">
            <Image src="/fotos/color_MinDesarrolloSocialYFamilia.jpg" alt="Ministerio de Desarrollo Social y Familia" width={90} height={36} className="h-9 w-auto" />
            <Image src="/fotos/SecretariaGobiernoDigital.png" alt="Secretaría de Gobierno Digital" width={90} height={36} className="h-7 w-auto" />
            <Image src="/fotos/ClaveUnica.png" alt="ClaveÚnica" width={90} height={36} className="h-6 w-auto" />
          </div>
        </div>
      </m.div>
    </m.footer>
  );
}
