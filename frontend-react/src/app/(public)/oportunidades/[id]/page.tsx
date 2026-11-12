"use client";

import { ArrowLeft, ArrowUpRight, CheckCircle2, Mail, Phone, User } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { DeadlineBadge } from "@/components/oportunidades/OportunidadCard";
import Entrada from "@/components/public/Entrada";
import { Alert, Avatar, Badge, Button, Card, ErrorState, Field, LinkButton, Modal, Select, Spinner, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch, fileUrl } from "@/lib/api";
import { ESTADO_POSTULACION_TONE } from "@/lib/constants";
import { daysUntil, formatDate } from "@/lib/format";
import type { Oportunidad, PreguntaOportunidad } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

function Cifra({ label, value, i }: { label: string; value: React.ReactNode; i: number }) {
  return (
    <div className="cifra-banda min-w-0" style={{ "--i": i } as React.CSSProperties}>
      <p className="truncate text-sm text-papel/65">{label}</p>
      <p className="mt-1.5 font-display text-[clamp(1.25rem,1rem+0.9vw,1.75rem)] leading-[1.1] tracking-[-0.02em] text-papel [text-wrap:balance]">{value}</p>
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
  const ubicacion = ((op.ubicaciones ?? []).length ? op.ubicaciones : [{ comuna: op.comuna, ciudad: op.ciudad, region: op.region }])
    .map((u) => [u.comuna, u.ciudad, u.region].filter(Boolean).join(", "))
    .filter(Boolean)
    .join(" · ");
  const avance = op.meta_postulantes ? Math.min(1, op.num_postulaciones / op.meta_postulantes) : null;

  async function postular(respuestas: Record<string, string>) {
    setSending(true);
    try {
      await apiFetch(`/oportunidades/${op!.id}/postular`, {
        method: "POST",
        body: Object.keys(respuestas).length ? { respuestas } : undefined,
      });
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
          <p className="text-center text-sm text-fg-muted">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="font-semibold text-brand underline-offset-4 hover:underline">
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
    <>
      {/* Banda de tinta: título, organización y cifras clave */}
      <section className="bg-tinta text-papel">
        <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-10">
          <Entrada>
            <button
              type="button"
              onClick={() => router.back()}
              className="group inline-flex items-center gap-1.5 text-sm font-medium text-papel/70 transition-colors hover:text-papel"
            >
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 ease-[var(--ease-out)] group-hover:-translate-x-1" /> Volver
            </button>
          </Entrada>

          <div className="mt-10 grid gap-x-8 gap-y-10 lg:grid-cols-12 lg:items-end">
            <Entrada retraso={0.05} className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-2">
                {op.tipo_de_voluntariado && <Badge tone="blue">{op.tipo_de_voluntariado}</Badge>}
                <DeadlineBadge fecha={op.fecha_limite_postulacion} estado={op.estado} />
              </div>
              <h1 className="mt-5 max-w-[20ch] font-display text-[clamp(2.25rem,1.2rem+3.6vw,4.75rem)] leading-[0.98] tracking-[-0.03em] text-papel [text-wrap:balance]">
                {op.titulo}
              </h1>
            </Entrada>
            <Entrada retraso={0.12} className="lg:col-span-4 lg:justify-self-end">
              <Link
                href={`/organizaciones/${op.organizacion_id}`}
                className="group inline-flex items-center gap-3 rounded-2xl bg-papel/8 py-2.5 pl-2.5 pr-5 transition-colors duration-200 hover:bg-papel/14 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar"
              >
                <Avatar name={op.organizacion_nombre} src={op.organizacion_tiene_logo ? fileUrl.logo(op.organizacion_id) : null} size={44} className="ring-papel/20" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-papel">{op.organizacion_nombre}</span>
                  <span className="inline-flex items-center gap-1 text-xs text-ambar">
                    Ver organización <ArrowUpRight className="h-3 w-3 transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </span>
              </Link>
            </Entrada>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 rounded-2xl bg-papel/6 p-6 sm:grid-cols-3 lg:mt-16 lg:grid-cols-6 lg:p-8">
            <Cifra i={0} label="Dónde" value={ubicacion || "Por definir"} />
            <Cifra i={1} label="Postula hasta" value={formatDate(op.fecha_limite_postulacion, "Sin fecha límite")} />
            <Cifra
              i={2}
              label="Fechas"
              value={
                op.fecha_inicio_voluntariado
                  ? `${formatDate(op.fecha_inicio_voluntariado)}${op.fecha_fin_voluntariado ? ` – ${formatDate(op.fecha_fin_voluntariado)}` : ""}`
                  : "Por definir"
              }
            />
            <Cifra i={3} label="Horas" value={op.horas_voluntariado ? `${op.horas_voluntariado} h` : "Por definir"} />
            <Cifra i={4} label="Cupos" value={op.cupo_maximo ?? "Sin límite"} />
            <Cifra i={5} label="Postulantes" value={`${op.num_postulaciones}${op.meta_postulantes ? ` de ${op.meta_postulantes}` : ""}`} />
          </div>
        </div>
      </section>

      {/* Banner opcional de la convocatoria */}
      {op.tiene_imagen && (
        <Entrada className="mx-auto -mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element -- imagen de la API/CDN */}
          <img
            src={fileUrl.oportunidad(op.id)}
            alt={`Imagen de ${op.titulo}`}
            className="h-52 w-full rounded-3xl object-cover shadow-[8px_8px_0_0_var(--color-tinta)] sm:h-72 lg:h-96"
          />
        </Entrada>
      )}

      {/* Cuerpo: descripción a la izquierda, acción fija a la derecha */}
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8 lg:py-20">
        <Entrada as="article" retraso={0.25} className="lg:col-span-7">
          <h2 className="text-h2 text-fg">Sobre este voluntariado</h2>
          <p className="prose-text mt-6 max-w-[62ch] text-lg leading-[1.7] text-fg-secondary">{op.descripcion}</p>
        </Entrada>

        <Entrada as="aside" retraso={0.32} className="space-y-6 lg:col-span-4 lg:col-start-9 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-6">
            <h2 className="text-h3 text-fg">¿Te interesa?</h2>
            <div className="mt-4">{renderAction()}</div>
            {avance !== null && (
              <div className="mt-6">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-fg-muted">Postulantes</span>
                  <span className="font-semibold tabular-nums text-fg">
                    {op.num_postulaciones} de {op.meta_postulantes}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-clip rounded-full bg-papel-strong" role="presentation">
                  <div className="barra-avance h-full rounded-full bg-brand" style={{ width: `${Math.round(avance * 100)}%` }} />
                </div>
              </div>
            )}
          </Card>

          {(responsable || op.responsable_email || op.responsable_telefono) && (
            <Card className="p-6">
              <h2 className="text-h3 text-fg">Contacto</h2>
              <div className="mt-4 space-y-3 text-sm text-fg-secondary">
                {responsable && (
                  <p className="flex items-center gap-2.5">
                    <User className="h-4 w-4 text-fg-muted" /> {responsable}
                  </p>
                )}
                {(op.responsable_email_institucional || op.responsable_email) && (
                  <a href={`mailto:${op.responsable_email_institucional || op.responsable_email}`} className="flex items-center gap-2.5 break-all transition-colors hover:text-brand">
                    <Mail className="h-4 w-4 shrink-0 text-fg-muted" /> {op.responsable_email_institucional || op.responsable_email}
                  </a>
                )}
                {op.responsable_telefono && (
                  <a href={`tel:${op.responsable_telefono}`} className="flex items-center gap-2.5 transition-colors hover:text-brand">
                    <Phone className="h-4 w-4 text-fg-muted" /> {op.responsable_telefono}
                  </a>
                )}
              </div>
            </Card>
          )}

          <Link
            href={`/organizaciones/${op.organizacion_id}`}
            className="group flex items-center justify-between gap-4 rounded-2xl bg-brand px-6 py-5 text-white transition-colors duration-200 hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ambar"
          >
            <span className="text-sm font-semibold leading-snug">Más voluntariados de {op.organizacion_nombre}</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 transition-transform duration-300 ease-[var(--ease-out)] group-hover:rotate-45">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </Entrada>
      </div>

      <PostularModal
        open={confirm}
        onClose={() => setConfirm(false)}
        onSubmit={postular}
        loading={sending}
        titulo={op.titulo}
        preguntas={op.preguntas}
      />
    </>
  );
}

/** Confirmación de postulación; si la convocatoria tiene preguntas, se responden aquí antes de enviar. */
function PostularModal({
  open,
  onClose,
  onSubmit,
  loading,
  titulo,
  preguntas,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (respuestas: Record<string, string>) => void;
  loading: boolean;
  titulo: string;
  preguntas: PreguntaOportunidad[];
}) {
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar postulación"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit(respuestas)} loading={loading}>
            Enviar postulación
          </Button>
        </>
      }
    >
      <p className="text-sm text-fg-secondary">
        Vas a postular a <strong>{titulo}</strong>. La organización revisará tu perfil y te notificará por correo.
      </p>
      {preguntas.length > 0 && (
        <div className="mt-5 space-y-4 border-t border-border pt-4">
          <p className="text-sm font-semibold text-fg">La organización pide responder antes de postular:</p>
          {preguntas.map((q) => (
            <Field key={q.id} label={q.texto} required={q.obligatoria}>
              {(id) =>
                q.tipo === "si_no" ? (
                  <Select
                    id={id}
                    required={q.obligatoria}
                    value={respuestas[q.id] ?? ""}
                    onChange={(e) => setRespuestas((r) => ({ ...r, [q.id]: e.target.value }))}
                    options={["Sí", "No"]}
                    placeholder="Selecciona"
                  />
                ) : q.tipo === "alternativas" ? (
                  <Select
                    id={id}
                    required={q.obligatoria}
                    value={respuestas[q.id] ?? ""}
                    onChange={(e) => setRespuestas((r) => ({ ...r, [q.id]: e.target.value }))}
                    options={q.opciones}
                    placeholder="Selecciona"
                  />
                ) : (
                  <Textarea
                    id={id}
                    required={q.obligatoria}
                    maxLength={1000}
                    value={respuestas[q.id] ?? ""}
                    onChange={(e) => setRespuestas((r) => ({ ...r, [q.id]: e.target.value }))}
                    placeholder="Tu respuesta"
                  />
                )
              }
            </Field>
          ))}
        </div>
      )}
    </Modal>
  );
}
