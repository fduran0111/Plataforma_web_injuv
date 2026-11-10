"use client";

import { ArrowLeft, Award, Building2, Clock, Download, FileCheck2, HeartHandshake, Mail, MapPin, Pencil, Phone, Star } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import DatosTab from "@/components/perfil/DatosTab";
import DocumentosTab from "@/components/perfil/DocumentosTab";
import PostulacionesTab from "@/components/perfil/PostulacionesTab";
import { Avatar, Badge, Button, Card, Spinner, Stars } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { downloadFile, fileUrl } from "@/lib/api";
import { ROL_LABEL } from "@/lib/constants";
import { formatDate, formatNumber, fullName } from "@/lib/format";
import type { CertificadoPersonal, PostulacionUsuario, Usuario } from "@/lib/types";

type Modo = "perfil" | "datos" | "documentos";

const TIPO_CERT: Record<CertificadoPersonal["tipo"], string> = {
  antecedentes: "Certificado de antecedentes",
  inhabilidades: "Certificado de inhabilidades",
};

function edad(fecha: string | null): number | null {
  if (!fecha) return null;
  const n = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(n.getTime())) return null;
  const hoy = new Date();
  const cumplio = hoy.getMonth() > n.getMonth() || (hoy.getMonth() === n.getMonth() && hoy.getDate() >= n.getDate());
  return hoy.getFullYear() - n.getFullYear() - (cumplio ? 0 : 1);
}

function Resenas({ postulaciones }: { postulaciones: PostulacionUsuario[] }) {
  const reseñas = postulaciones.filter((p) => p.resena_org_publica && (p.resena_org || p.calificacion_org != null));
  if (!reseñas.length)
    return <p className="text-sm text-fg-muted">Cuando una organización te evalúe y publique su reseña, aparecerá aquí.</p>;
  return (
    <div className="space-y-4">
      {reseñas.map((p) => (
        <div key={p.id} className="rounded-xl bg-page p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-fg">{p.organizacion_nombre}</p>
            {p.calificacion_org != null && <Stars value={p.calificacion_org} />}
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">{p.oportunidad_titulo}</p>
          {p.resena_org && <p className="mt-2 text-sm text-fg-secondary">{p.resena_org}</p>}
        </div>
      ))}
    </div>
  );
}

function CertificadosPanel({
  user,
  postulaciones,
  onGestionar,
}: {
  user: Usuario;
  postulaciones: PostulacionUsuario[];
  onGestionar: () => void;
}) {
  const certsOp = postulaciones.filter((p) => p.tiene_certificado);
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold text-fg">Certificados</h3>
        <Button size="sm" variant="outline" onClick={onGestionar}>
          Gestionar
        </Button>
      </div>
      <div className="space-y-3">
        {user.certificados_personales.map((c) => (
          <div key={c.tipo} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-fg">{TIPO_CERT[c.tipo]}</h4>
              <Button size="sm" variant="ghost" onClick={() => downloadFile(`/usuarios/me/certificados/${c.tipo}`, `${c.tipo}.pdf`)} aria-label="Descargar">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-fg-muted">Emitido el {formatDate(c.fecha_emision)}</p>
            <Badge tone="green" className="mt-2">
              <FileCheck2 className="h-3.5 w-3.5" /> Vigente
            </Badge>
          </div>
        ))}
        {certsOp.map((p) => (
          <div key={p.id} className="rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-fg">Participación: {p.oportunidad_titulo}</h4>
              <Button size="sm" variant="ghost" onClick={() => downloadFile(`/postulaciones/${p.id}/certificado`, "certificado_voluntariado.pdf")} aria-label="Descargar">
                <Download className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-xs text-fg-muted">{p.organizacion_nombre}</p>
            <Badge tone="blue" className="mt-2">
              <Award className="h-3.5 w-3.5" /> Certificado de participación
            </Badge>
          </div>
        ))}
        {!user.certificados_personales.length && !certsOp.length && (
          <p className="text-sm text-fg-muted">Aún no tienes certificados. Los de participación aparecen cuando la organización los emite.</p>
        )}
      </div>
    </Card>
  );
}

function Perfil({ user }: { user: Usuario }) {
  const params = useSearchParams();
  const inicial = params.get("tab") === "documentos" ? "documentos" : params.get("tab") === "datos" ? "datos" : "perfil";
  const [modo, setModo] = useState<Modo>(inicial);
  const { data: postulaciones, loading } = useApi<PostulacionUsuario[]>("/usuarios/me/postulaciones");

  const ubicacion = [user.comuna, user.ciudad, user.region].filter(Boolean).join(", ");
  const edadUsuario = edad(user.fecha_nacimiento);
  const lista = postulaciones ?? [];
  const proyectos = lista.filter((p) => p.estado === "Seleccionado").length;
  const certificados = lista.filter((p) => p.tiene_certificado).length + user.certificados_personales.length;

  if (modo !== "perfil")
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" onClick={() => setModo("perfil")}>
          <ArrowLeft className="h-4 w-4" /> Volver a mi perfil
        </Button>
        <div className="mt-4">{modo === "datos" ? <DatosTab user={user} /> : <DocumentosTab user={user} />}</div>
      </div>
    );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Banner + franja con nombre (layout de referencia del template) */}
      <section className="overflow-clip rounded-3xl border-[1.5px] border-tinta shadow-[6px_6px_0_0_var(--color-tinta)]">
        <div className="relative h-36 bg-brand sm:h-40" aria-hidden />
        <div className="relative bg-surface px-4 pb-5 pt-16 sm:px-8 sm:pt-4">
          <div className="absolute -top-12 left-6 sm:-top-14 sm:left-8">
            <Avatar name={fullName(user)} src={user.tiene_foto ? fileUrl.foto(user.id, user.foto_version) : null} size={112} className="ring-4 ring-surface" />
          </div>
          <Button size="sm" variant="outline" className="absolute right-4 top-3" onClick={() => setModo("datos")}>
            <Pencil className="h-4 w-4" /> Editar perfil
          </Button>
          <div className="sm:pl-32">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-bold leading-tight text-fg">{fullName(user)}</h1>
              <Badge tone="blue">{ROL_LABEL[user.rol]}</Badge>
              {user.organizacion && (
                <Link
                  href={`/organizaciones/${user.organizacion.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-tinta bg-ambar/25 px-3 py-1 text-xs font-semibold text-fg transition-colors hover:bg-ambar/40"
                  title="Ver perfil de la organización"
                >
                  <Building2 className="h-3.5 w-3.5" /> {user.organizacion.nombre ?? "Organización"}
                  <span className="font-normal text-fg-muted">· {user.organizacion.rol === "miembro" ? "Miembro" : "Administrador"}</span>
                </Link>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-fg-muted">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {formatNumber(user.horas_voluntariado)} horas de voluntariado
              </span>
              {edadUsuario != null && <span>{edadUsuario} años</span>}
              {ubicacion && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" /> {ubicacion}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Columna izquierda */}
        <section className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-fg">Información de contacto</h2>
            <div className="space-y-2 text-fg-secondary">
              <p className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-fg-muted" /> {user.email}
              </p>
              {user.telefono && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-fg-muted" /> {user.telefono}
                </p>
              )}
              {ubicacion && (
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-fg-muted" /> {ubicacion}
                </p>
              )}
            </div>
          </Card>

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-fg">
              <HeartHandshake className="h-5 w-5 text-fg-muted" /> Experiencia de voluntariado
            </h2>
            <PostulacionesTab user={user} />
          </div>

          <Card className="p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-fg">
              <Star className="h-5 w-5 text-ambar" /> Reseñas y referencias
            </h2>
            {loading && !postulaciones ? <Spinner /> : <Resenas postulaciones={lista} />}
          </Card>
        </section>

        {/* Columna derecha */}
        <aside className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-4 text-xl font-semibold text-fg">Estadísticas de voluntariado</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-brand-soft p-4 text-center">
                <div className="text-2xl font-bold text-brand">{formatNumber(user.horas_voluntariado)}</div>
                <div className="mt-1 text-xs text-brand">Horas</div>
              </div>
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700">{proyectos}</div>
                <div className="mt-1 text-xs text-emerald-800">Proyectos</div>
              </div>
              <div className="rounded-xl bg-amber-50 p-4 text-center">
                <div className="text-2xl font-bold text-amber-700">{certificados}</div>
                <div className="mt-1 text-xs text-amber-800">Certificados</div>
              </div>
            </div>
          </Card>

          <CertificadosPanel user={user} postulaciones={lista} onGestionar={() => setModo("documentos")} />
        </aside>
      </main>
    </div>
  );
}

export default function PerfilPage() {
  return (
    <RequireAuth roles={["user", "organizacion"]}>
      {(user) => (
        <Suspense>
          <Perfil user={user} />
        </Suspense>
      )}
    </RequireAuth>
  );
}
