"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import Portada from "@/components/public/Portada";
import { Button, LinkButton } from "@/components/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <>
      <Portada
        tono="ambar"
        lineas={["Algo no", "salió bien"]}
        texto="No pudimos cargar esta página. Intenta de nuevo en unos segundos."
      />
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          <Button onClick={reset}>
            <RotateCcw className="h-4 w-4" /> Intentar de nuevo
          </Button>
          <LinkButton href="/" variant="outline">
            Volver al inicio
          </LinkButton>
        </div>
      </div>
    </>
  );
}
