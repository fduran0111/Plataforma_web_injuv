"use client";

import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  Mail,
  MapPin,
  Phone,
  Target,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DeadlineBadge } from "@/components/oportunidades/OportunidadCard";
import { Alert, Avatar, Badge, Button, Card, ConfirmModal, ErrorState, LinkButton, Spinner } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, fileUrl } from "@/lib/api";
import { ESTADO_POSTULACION_TONE } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import type { Oportunidad } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

function Detail({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-brand-soft p-2 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-medium text-fg-muted">{label}</p>
        <p className="text-sm font-semibold text-fg">{value}</p>
      </div>
    </div>
  );
}

export default function OportunidadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const { data: op, loading, error, reload } = useApi<Oportunidad>(`/oportunidades/${id}`);
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);

  if (loading && !op) return <Spinner className="py-32" label="Cargando voluntariado…" />;
  if (error || !op)
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState message={error ?? "No encontramos este voluntariado"} onRetry={reload} />
      </div>
    );

  const dias = daysUntil(op.fecha_limite_postulacion);
  const abierta = op.estado !== "cerrada" && (dias === null || dias >= 0);
  const responsable = `${op.responsable_nombre} ${op.responsable_apellido}`.trim();
  const ubicacion = [op.comuna, op.ciudad, op.region].filter(Boolean).join(", ");

  async function postular() {
    setSending(true);
    try {
      await apiFetch(`/oportunidades/${op!.id}/postular`, { method: "POST" });
      toast("¡Postulación enviada! Puedes seguir su estado en tu perfil.");
      setConfirm(false);
      reload();
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setSending(false);
    }
  }

  function renderAction() {
    if (op!.mi_postulacion)
      return (
        <div className="space-y-3">
          <Alert tone="green" className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Ya postulaste a este voluntariado
          </Alert>
          <div className="flex items-center justify-between text-sm">
            <span className="text-fg-muted">Estado</span>
            <Badge tone={ESTADO_POSTULACION_TONE[op!.mi_postulacion.estado] ?? "neutral"}>{op!.mi_postulacion.estado}</Badge>
          </div>
          <LinkButton href="/perfil?tab=postulaciones" variant="outline" className="w-full">
            Ver mis postulaciones
          </LinkButton>
        </div>
      );
    if (!abierta) return <Alert tone="amber">Este voluntariado ya no recibe postulaciones.</Alert>;
    if (!user)
      return (
        <div className="space-y-3">
          <LinkButton href={`/login?next=/oportunidades/${op!.id}`} size="lg" className="w-full">
            Inicia sesión para postular
          </LinkButton>
          <p className="text-center text-xs text-fg-muted">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-brand">
              Regístrate
            </Link>
          </p>
        </div>
      );
    if (user.rol !== "user")
      return <Alert tone="blue">Solo las cuentas de voluntario pueden postular a voluntariados.</Alert>;
    return (
      <Button size="lg" className="w-full" onClick={() => setConfirm(true)}>
        Postular ahora
      </Button>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <button type="button" onClick={() => router.back()} className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2">
              {op.tipo_de_voluntariado && <Badge tone="blue">{op.tipo_de_voluntariado}</Badge>}
              <DeadlineBadge fecha={op.fecha_limite_postulacion} estado={op.estado} />
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-fg">{op.titulo}</h1>
            <Link href={`/organizaciones/${op.organizacion_id}`} className="mt-4 inline-flex items-center gap-3 rounded-xl hover:opacity-80">
              <Avatar name={op.organizacion_nombre} src={op.organizacion_tiene_logo ? fileUrl.logo(op.organizacion_id) : null} size={40} />
              <div>
                <p className="text-sm font-semibold text-fg">{op.organizacion_nombre}</p>
                <p className="text-xs text-brand">Ver perfil de la organización</p>
              </div>
            </Link>
            <div className="mt-8 border-t border-border pt-6">
              <h2 className="font-semibold text-fg">Descripción</h2>
              <p className="prose-text mt-3 text-fg-secondary">{op.descripcion}</p>
            </div>
          </Card>

          <Card className="p-6 sm:p-8">
            <h2 className="mb-5 font-semibold text-fg">Detalles del voluntariado</h2>
            <div className="grid gap-5 sm:grid-cols-2">
              <Detail icon={MapPin} label="Ubicación" value={ubicacion || "Por definir"} />
              <Detail icon={CalendarDays} label="Postulaciones hasta" value={formatDate(op.fecha_limite_postulacion, "Sin fecha límite")} />
              <Detail
                icon={CalendarCheck}
                label="Fechas del voluntariado"
                value={
                  op.fecha_inicio_voluntariado
                    ? `${formatDate(op.fecha_inicio_voluntariado)}${op.fecha_fin_voluntariado ? ` – ${formatDate(op.fecha_fin_voluntariado)}` : ""}`
                    : "Por definir"
                }
              />
              <Detail icon={Clock} label="Horas estimadas" value={op.horas_voluntariado ? `${op.horas_voluntariado} horas` : "Por definir"} />
              <Detail icon={Users} label="Cupos" value={op.cupo_maximo ?? "Sin límite"} />
              <Detail icon={Target} label="Postulantes" value={`${op.num_postulaciones}${op.meta_postulantes ? ` de ${op.meta_postulantes}` : ""}`} />
            </div>
          </Card>
        </div>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="mb-4 font-semibold text-fg">¿Te interesa?</h2>
            {renderAction()}
          </Card>
          {(responsable || op.responsable_email || op.responsable_telefono) && (
            <Card className="p-6">
              <h2 className="mb-4 font-semibold text-fg">Contacto</h2>
              <div className="space-y-3 text-sm text-fg-secondary">
                {responsable && (
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-fg-muted" /> {responsable}
                  </p>
                )}
                {(op.responsable_email_institucional || op.responsable_email) && (
                  <a href={`mailto:${op.responsable_email_institucional || op.responsable_email}`} className="flex items-center gap-2 hover:text-brand">
                    <Mail className="h-4 w-4 text-fg-muted" /> {op.responsable_email_institucional || op.responsable_email}
                  </a>
                )}
                {op.responsable_telefono && (
                  <a href={`tel:${op.responsable_telefono}`} className="flex items-center gap-2 hover:text-brand">
                    <Phone className="h-4 w-4 text-fg-muted" /> {op.responsable_telefono}
                  </a>
                )}
              </div>
            </Card>
          )}
          <Card className="p-6">
            <Link href={`/organizaciones/${op.organizacion_id}`} className="flex items-center gap-2 text-sm font-semibold text-brand">
              <Building2 className="h-4 w-4" /> Más voluntariados de {op.organizacion_nombre}
            </Link>
          </Card>
        </aside>
      </div>

      <ConfirmModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={postular}
        loading={sending}
        title="Confirmar postulación"
        confirmLabel="Enviar postulación"
        message={
          <>
            Vas a postular a <strong>{op.titulo}</strong>. La organización revisará tu perfil y te notificará por correo. Asegúrate de tener tus datos de contacto
            actualizados en tu perfil.
          </>
        }
      />
    </div>
  );
}
