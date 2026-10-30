"use client";

import { ExternalLink, HeartHandshake, Mail, MessageSquareQuote, Star, Users } from "lucide-react";
import { LinkButton, PageHeader, Spinner, StatCard } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { formatNumber } from "@/lib/format";
import type { Oportunidad, Organizacion } from "@/lib/types";

export default function OrganizacionResumenPage() {
  const org = useApi<Organizacion>("/organizaciones/mia");
  const ops = useApi<Oportunidad[]>("/oportunidades/mias");

  if (org.loading && !org.data) return <Spinner label="Cargando tu organización…" />;
  const o = org.data;
  const abiertas = (ops.data ?? []).filter((op) => op.estado !== "cerrada");
  const postulaciones = (ops.data ?? []).reduce((acc, op) => acc + op.num_postulaciones, 0);

  return (
    <>
      <PageHeader
        title={`Hola, ${o?.nombre ?? ""}`}
        description="Así va tu organización en la plataforma."
        actions={
          <>
            {o && (
              <LinkButton href={`/organizaciones/${o.id}`} variant="outline" size="sm">
                <ExternalLink className="h-4 w-4" /> Ver perfil público
              </LinkButton>
            )}
            <LinkButton href="/organizacion/oportunidades?nueva=1" size="sm">
              <HeartHandshake className="h-4 w-4" /> Publicar voluntariado
            </LinkButton>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={HeartHandshake} label="Voluntariados abiertos" value={abiertas.length} hint={`${ops.data?.length ?? 0} en total`} tone="blue" />
        <StatCard icon={Users} label="Postulaciones recibidas" value={formatNumber(postulaciones)} tone="violet" />
        <StatCard
          icon={Star}
          label="Calificación promedio"
          value={o?.calificacion_promedio != null ? `${o.calificacion_promedio} / 5` : "Sin reseñas"}
          tone="amber"
        />
        <StatCard
          icon={Mail}
          label="Correo de contacto"
          value={<span className="block truncate text-base">{o?.email_contacto || "Sin configurar"}</span>}
          tone="green"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="font-semibold text-fg">Voluntariados abiertos</h2>
          {!abiertas.length ? (
            <p className="mt-3 text-sm text-fg-muted">No tienes voluntariados abiertos. Publica uno para empezar a recibir postulaciones.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {abiertas.slice(0, 5).map((op) => (
                <li key={op.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <a href={`/organizacion/oportunidades/${op.id}`} className="truncate font-medium text-fg hover:text-brand">
                    {op.titulo}
                  </a>
                  <span className="shrink-0 text-fg-muted">{op.num_postulaciones} postulantes</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6">
          <h2 className="flex items-center gap-2 font-semibold text-fg">
            <MessageSquareQuote className="h-4 w-4 text-brand" /> Recomendación
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            Mantén actualizado el perfil de tu organización con logo, descripción y certificaciones: los voluntarios confían más en organizaciones
            verificadas. Después de cada actividad, registra la asistencia y las horas para emitir los certificados.
          </p>
        </div>
      </div>
    </>
  );
}
