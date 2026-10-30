"use client";

import { BookOpen, Building2, Clock, GraduationCap, HeartHandshake, Inbox, Newspaper, Users, UserCheck } from "lucide-react";
import { useState } from "react";
import BarChart, { HBarChart } from "@/components/admin/BarChart";
import { Card, ErrorState, LinkButton, PageHeader, Select, Spinner, StatCard } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { formatNumber } from "@/lib/format";
import type { EstadisticasAdmin } from "@/lib/types";

export default function AdminResumenPage() {
  const [anio, setAnio] = useState(String(new Date().getFullYear()));
  const { data, loading, error, reload } = useApi<EstadisticasAdmin>(`/admin/estadisticas?anio=${anio}`);

  if (loading && !data) return <Spinner label="Cargando estadísticas…" />;
  if (error || !data) return <ErrorState message={error ?? "Error"} onRetry={reload} />;
  const r = data.resumen;
  const anios = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <>
      <PageHeader
        title="Resumen de la plataforma"
        description="Panorama general de usuarios, voluntariados y actividad."
        actions={
          r.solicitudes_pendientes > 0 && (
            <LinkButton href="/admin/solicitudes" size="sm">
              <Inbox className="h-4 w-4" /> {r.solicitudes_pendientes} solicitudes pendientes
            </LinkButton>
          )
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Usuarios registrados" value={formatNumber(r.usuarios)} hint={`${formatNumber(r.voluntarios)} voluntarios`} tone="blue" />
        <StatCard icon={Building2} label="Organizaciones" value={formatNumber(r.organizaciones)} tone="violet" />
        <StatCard icon={HeartHandshake} label="Voluntariados" value={formatNumber(r.oportunidades)} hint={`${formatNumber(r.oportunidades_abiertas)} abiertos`} tone="green" />
        <StatCard icon={UserCheck} label="Postulaciones" value={formatNumber(r.postulaciones)} hint={`${formatNumber(r.seleccionados)} seleccionados`} tone="amber" />
        <StatCard icon={Clock} label="Horas de voluntariado" value={formatNumber(r.horas_voluntariado)} tone="blue" />
        <StatCard icon={Newspaper} label="Noticias publicadas" value={formatNumber(r.noticias)} tone="green" />
        <StatCard icon={BookOpen} label="Biblioteca" value={formatNumber(r.documentos_biblioteca)} hint="documentos" tone="violet" />
        <StatCard icon={GraduationCap} label="Academia" value={formatNumber(r.documentos_academia)} hint={`${formatNumber(r.academia_pendientes)} por revisar`} tone="amber" />
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-semibold text-fg">Actividad del año {data.anio}</h2>
        <Select aria-label="Año" value={anio} onChange={(e) => setAnio(e.target.value)} options={anios} className="h-9 w-28 text-sm" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg">Nuevos usuarios</h3>
          <BarChart data={data.usuarios_por_mes} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg">Voluntariados creados</h3>
          <BarChart data={data.oportunidades_por_mes} color="bg-emerald-500" />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg">Postulaciones</h3>
          <BarChart data={data.postulaciones_por_mes} color="bg-violet-500" />
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg">Voluntariados por área</h3>
          <HBarChart data={data.oportunidades_por_area} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg">Postulaciones por estado</h3>
          <HBarChart data={data.postulaciones_por_estado} />
        </Card>
        <Card className="p-5">
          <h3 className="mb-4 text-sm font-semibold text-fg">Organizaciones más activas</h3>
          <HBarChart data={data.oportunidades_por_organizacion} />
        </Card>
      </div>
    </>
  );
}
