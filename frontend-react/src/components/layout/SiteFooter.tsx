import { Clock, Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { NAV_LINKS } from "@/components/layout/nav";

const LINK = "underline-offset-4 decoration-ambar/0 transition-colors hover:text-papel hover:underline hover:decoration-ambar";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t-[1.5px] border-tinta bg-tinta text-papel/75">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div>
          <p className="font-display text-h3 text-papel">INJUV Voluntariado</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed">
            Conectamos a jóvenes de todo Chile, de Arica a Magallanes, con organizaciones que transforman sus comunidades.
          </p>
        </div>
        <div>
          <p className="font-display text-sm text-papel">Explora</p>
          <ul className="mt-3 space-y-2 text-sm">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={LINK}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-display text-sm text-papel">Organizaciones</p>
          <ul className="mt-3 space-y-2 text-sm">
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
        </div>
        <div>
          <p className="font-display text-sm text-papel">Contacto</p>
          <ul className="mt-3 space-y-2.5 text-sm">
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
        </div>
      </div>
      <div className="border-t-[1.5px] border-dashed border-papel/20">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row sm:px-6 lg:px-8">
          <p className="text-xs text-papel/55">© {new Date().getFullYear()} Instituto Nacional de la Juventud · Gobierno de Chile</p>
          <div className="flex items-center gap-3 rounded-md bg-papel px-4 py-2">
            <Image src="/fotos/color_MinDesarrolloSocialYFamilia.jpg" alt="Ministerio de Desarrollo Social y Familia" width={90} height={36} className="h-9 w-auto" />
            <Image src="/fotos/SecretariaGobiernoDigital.png" alt="Secretaría de Gobierno Digital" width={90} height={36} className="h-7 w-auto" />
            <Image src="/fotos/ClaveUnica.png" alt="ClaveÚnica" width={90} height={36} className="h-6 w-auto" />
          </div>
        </div>
      </div>
      <div className="flex h-1.5">
        <div className="w-2/5 bg-brand" />
        <div className="w-3/5 bg-brand-red" />
      </div>
    </footer>
  );
}
