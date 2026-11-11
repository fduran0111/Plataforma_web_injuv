import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteHeader from "@/components/layout/SiteHeader";
import Portada from "@/components/public/Portada";
import { LinkButton } from "@/components/ui";

export const metadata: Metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Portada
          tono="tinta"
          lineas={["Esta página", "no existe"]}
          texto="Puede que el enlace esté mal escrito o que la página se haya movido."
        />
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/">Volver al inicio</LinkButton>
            <LinkButton href="/oportunidades" variant="outline">
              Ver voluntariados <ArrowRight className="h-4 w-4" />
            </LinkButton>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
