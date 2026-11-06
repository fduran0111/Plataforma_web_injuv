import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/format";

type Tono = "foto" | "tinta" | "azul" | "ambar";

const FONDO: Record<Tono, string> = {
  foto: "bg-tinta text-papel",
  tinta: "bg-tinta text-papel",
  azul: "bg-brand text-white",
  ambar: "bg-ambar text-tinta",
};

const TEXTO: Record<Tono, string> = {
  foto: "text-papel/85",
  tinta: "text-papel/80",
  azul: "text-white/85",
  ambar: "text-tinta/75",
};

/**
 * Portada de las páginas interiores: una banda de color o de foto con el título en dos líneas
 * enmascaradas (suben desde detrás de su caja, igual que en la portada del sitio) y una
 * entradilla. `children` es la barra de filtros, que se monta a caballo del borde inferior.
 *
 * - `lineas`: el título partido en 1 o 2 líneas (la regla de la casa: nunca más de dos).
 * - `lado`: contenido opcional a la derecha del título (una cifra, un bloque de datos).
 */
export default function Portada({
  lineas,
  texto,
  tono = "tinta",
  foto,
  alt = "",
  lado,
  children,
  compacta,
}: {
  lineas: [string] | [string, string];
  texto?: string;
  tono?: Tono;
  foto?: StaticImageData;
  alt?: string;
  lado?: React.ReactNode;
  children?: React.ReactNode;
  compacta?: boolean;
}) {
  return (
    <>
      <section className={cn("relative overflow-clip", FONDO[tono])}>
        {foto && (
          <div className="absolute inset-0" aria-hidden>
            <Image src={foto} alt={alt} fill priority sizes="100vw" className="portada-foto object-cover" />
            <div className="absolute inset-0 bg-tinta/65" />
          </div>
        )}
        <div
          className={cn(
            "relative mx-auto flex max-w-7xl flex-col justify-end px-4 sm:px-6 lg:px-8",
            compacta ? "pt-12 pb-10 lg:pt-16 lg:pb-12" : "min-h-[52svh] pt-16 pb-12 lg:pb-16",
            !!children && !compacta && "pb-24 lg:pb-28",
            !!children && compacta && "pb-20 lg:pb-24",
          )}
        >
          <div className="grid gap-x-8 gap-y-10 lg:grid-cols-12 lg:items-end">
            <div className={cn(lado ? "lg:col-span-8" : "lg:col-span-10")}>
              <h1 className="font-display text-[clamp(2.75rem,1.3rem+5.2vw,6.5rem)] leading-[0.94] tracking-[-0.035em]">
                {lineas.map((l) => (
                  <span key={l} className="linea">
                    <span>{l}</span>
                  </span>
                ))}
              </h1>
              {texto && <p className={cn("hero-sigue mt-6 max-w-[52ch] text-lg sm:text-xl", TEXTO[tono])}>{texto}</p>}
            </div>
            {lado && <div className="hero-sigue lg:col-span-4 lg:justify-self-end">{lado}</div>}
          </div>
        </div>
      </section>
      {children && (
        <div className="relative z-10 mx-auto -mt-12 max-w-7xl px-4 sm:px-6 lg:-mt-14 lg:px-8">
          <div className="hero-sigue rounded-2xl bg-papel p-2 shadow-[0_30px_70px_-30px_rgb(15_27_45/0.55)] ring-[1.5px] ring-tinta/10">
            {children}
          </div>
        </div>
      )}
    </>
  );
}
