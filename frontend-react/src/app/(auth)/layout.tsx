import { ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logo from "../../../public/logo-injuv.png";
import foto from "../../../public/fotos/voluntariado-2.jpg";
import { fileUrl } from "@/lib/api";
import { ACCESO_DEF, cargarPortada } from "@/lib/portada";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const portada = await cargarPortada();
  const acceso = portada?.fotos.acceso?.[0];
  const cfg = portada?.config;
  return (
    <div className="grid min-h-screen bg-papel lg:grid-cols-2">
      <div className="flex flex-col px-5 py-7 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="w-fit">
            <Image src={logo} alt="INJUV" height={44} className="h-11 w-auto" priority />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-xs text-fg-muted">© {new Date().getFullYear()} Instituto Nacional de la Juventud</p>
      </div>
      <div className="hidden lg:sticky lg:top-0 lg:grid lg:h-svh lg:grid-rows-[1fr_auto]">
        <div className="relative overflow-hidden">
          {acceso ? (
            <Image src={fileUrl.portada(acceso.archivo)} alt={acceso.alt} fill unoptimized className="object-cover" priority />
          ) : (
            <Image src={foto} alt="Jóvenes voluntarios de INJUV" fill className="object-cover" sizes="50vw" priority />
          )}
        </div>
        <div className="grid grid-cols-5">
          <div className="col-span-2 flex flex-col justify-end bg-tinta p-9 text-papel">
            <p className="font-display text-xl leading-tight">{cfg?.acceso_titulo || ACCESO_DEF.titulo}</p>
            <p className="mt-2 text-sm text-papel/70">{cfg?.acceso_subtitulo || ACCESO_DEF.subtitulo}</p>
          </div>
          <div className="col-span-3 bg-ambar p-9 text-tinta">
            <blockquote className="max-w-[24ch] font-display text-[clamp(1.5rem,1.9vw,2.1rem)] leading-[1.12] tracking-[-0.015em]">
              <span className="-ml-[0.4em]">“</span>
              {cfg?.acceso_cita || ACCESO_DEF.cita}”
            </blockquote>
          </div>
        </div>
      </div>
    </div>
  );
}
