import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/logo-injuv.png";
import foto from "../../../public/fotos/voluntariado-2.jpg";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="w-fit">
          <Image src={logo} alt="INJUV" height={44} className="h-11 w-auto" priority />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-xs text-fg-muted">© {new Date().getFullYear()} Instituto Nacional de la Juventud</p>
      </div>
      <div className="relative hidden overflow-hidden lg:block">
        <Image src={foto} alt="Jóvenes voluntarios de INJUV" fill className="object-cover" sizes="50vw" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/40 to-transparent" />
        <div className="absolute bottom-0 p-12 text-white">
          <p className="text-3xl font-bold leading-tight">Tu tiempo puede cambiar una comunidad.</p>
          <p className="mt-3 max-w-md text-white/80">
            Encuentra voluntariados en todo Chile, postula en minutos y certifica tu experiencia.
          </p>
        </div>
      </div>
    </div>
  );
}
