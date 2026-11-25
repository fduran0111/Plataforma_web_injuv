"use client";

import { Armchair, ArrowLeft, CalendarDays, Mail, MapPin, Send, Target, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import PostulanteCard from "@/components/organizacion/PostulanteCard";
import { Alert, Badge, Button, Card, EmptyState, ErrorState, Input, Modal, Select, Spinner, Tabs, Textarea } from "@/components/ui";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { ESTADOS_POSTULACION } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { puedeGestionarOportunidad, puedeTutorear } from "@/lib/permisos";
import type { Oportunidad, Postulante } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export default function PostulantesPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { user } = useAuth();
  const op = useApi<Oportunidad>(`/oportunidades/${id}`);
  const postulantes = useApi<Postulante[]>(`/oportunidades/${id}/postulaciones`);
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  // Filtro por respuesta a una pregunta de la convocatoria: {idPregunta: valor elegido}
  const [filtroPregunta, setFiltroPregunta] = useState<Record<string, string>>({});
  const [correoOpen, setCorreoOpen] = useState(false);
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [destinatarios, setDestinatarios] = useState("todos");
  const [sending, setSending] = useState(false);

  const preguntasFiltrables = (op.data?.preguntas ?? []).filter((q) => q.tipo !== "texto");
  // Los tutores/encargados postulan como cualquier usuario, pero no cuentan como postulantes:
  // se muestran en una sección aparte al final.
  const voluntarios = (postulantes.data ?? []).filter((p) => !p.es_encargado);
  const encargados = (postulantes.data ?? []).filter((p) => p.es_encargado);
  const lista = voluntarios.filter(
    (p) =>
      (estadoFiltro === "todos" || p.estado === estadoFiltro) &&
      Object.entries(filtroPregunta).every(([pid, valor]) => !valor || ((p.respuestas ?? {})[pid] ?? "").split("\n").includes(valor)),
  );
  const conteo = (e: string) => voluntarios.filter((p) => p.estado === e).length;

  async function enviarCorreo(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      const res = await apiFetch<{ enviados: number; total: number }>(`/oportunidades/${id}/correo-masivo`, {
        method: "POST",
        body: { asunto, mensaje, filtro_estado: destinatarios },
      });
      toast(`Correo enviado a ${res.enviados} de ${res.total} postulantes`);
      setCorreoOpen(false);
      setAsunto("");
      setMensaje("");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setSending(false);
    }
  }

  if ((op.loading && !op.data) || (postulantes.loading && !postulantes.data)) return <Spinner label="Cargando postulantes…" />;
  if (op.error || postulantes.error)
    return <ErrorState message={op.error ?? postulantes.error ?? "Error"} onRetry={() => { op.reload(); postulantes.reload(); }} />;
  const o = op.data!;
  const gestiona = puedeGestionarOportunidad(user, o);
  const soloLectura = !puedeTutorear(user, o);
  const modo = gestiona ? "gestion" : soloLectura ? "lectura" : "tutor";

  return (
    <>
      <Link href="/organizacion/oportunidades" className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> Mis voluntariados
      </Link>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-fg">{o.titulo}</h1>
            <Badge tone={o.estado === "cerrada" ? "slate" : "green"}>{o.estado === "cerrada" ? "Cerrada" : "Abierta"}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-fg-muted">
            {o.fecha_limite_postulacion && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Postulaciones hasta {formatDate(o.fecha_limite_postulacion)}
              </span>
            )}
            {[o.comuna, o.region].filter(Boolean).length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {[o.comuna, o.region].filter(Boolean).join(", ")}
                {(o.ubicaciones?.length ?? 0) > 1 ? ` (+${o.ubicaciones.length - 1} ubicaciones más)` : ""}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {voluntarios.length} postulantes
            </span>
            {o.meta_postulantes ? (
              <span className="flex items-center gap-1.5">
                <Target className="h-4 w-4" /> Meta: {o.meta_postulantes}
                {voluntarios.length >= o.meta_postulantes ? " (alcanzada)" : ` (faltan ${o.meta_postulantes - voluntarios.length})`}
              </span>
            ) : null}
            {o.cupo_maximo ? (
              <span className="flex items-center gap-1.5">
                <Armchair className="h-4 w-4" /> {conteo("Seleccionado")} de {o.cupo_maximo} cupos ocupados
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-2">
          {!soloLectura && (
            <Button variant="outline" size="sm" disabled={!voluntarios.length} onClick={() => setCorreoOpen(true)}>
              <Mail className="h-4 w-4" /> Correo masivo
            </Button>
          )}
          <Link href={`/oportunidades/${o.id}`} className="text-sm font-medium text-brand hover:underline">
            Ver página pública
          </Link>
        </div>
      </div>

      {soloLectura && (
        <Alert tone="blue" className="mt-4">
          Estás viendo este voluntariado en <strong>modo lectura</strong>. Solo sus tutores y el administrador de la organización pueden registrar asistencia y horas.
        </Alert>
      )}
      {modo === "tutor" && (
        <Alert tone="blue" className="mt-4">
          Eres <strong>tutor</strong> de este voluntariado: puedes registrar asistencia y horas, evaluar a tus voluntarios y escribirles por correo. Los estados de postulación y los certificados los gestiona el administrador de la organización.
        </Alert>
      )}

      <div className="mt-6">
        <Tabs
          value={estadoFiltro}
          onChange={setEstadoFiltro}
          tabs={[
            { value: "todos", label: "Todos", count: voluntarios.length },
            ...(ESTADOS_POSTULACION as unknown as string[]).map((e) => ({ value: e, label: e, count: conteo(e) })),
          ]}
        />
      </div>

      {preguntasFiltrables.length > 0 && (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          {preguntasFiltrables.map((q) => (
            <Select
              key={q.id}
              aria-label={`Filtrar por: ${q.texto}`}
              value={filtroPregunta[q.id] ?? ""}
              onChange={(e) => setFiltroPregunta((f) => ({ ...f, [q.id]: e.target.value }))}
              options={(q.tipo === "si_no" ? ["Sí", "No"] : q.opciones).map((v) => ({ value: v, label: v }))}
              placeholder={`${q.texto} — todas`}
              className="max-w-72"
            />
          ))}
          {Object.values(filtroPregunta).some(Boolean) && (
            <Button variant="ghost" size="sm" onClick={() => setFiltroPregunta({})}>
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 space-y-4">
        {!lista.length ? (
          <EmptyState
            icon={Users}
            title={estadoFiltro === "todos" ? "Aún no hay postulantes" : `No hay postulantes en "${estadoFiltro}"`}
            description={estadoFiltro === "todos" ? "Comparte el enlace público del voluntariado para atraer postulantes." : undefined}
          />
        ) : (
          lista.map((p) => <PostulanteCard key={p.id} p={p} oportunidadTitulo={o.titulo} preguntas={o.preguntas} modo={modo} onChanged={(next) => postulantes.setData((prev) => (prev ?? []).map((x) => (x.id === next.id ? { ...x, ...next } : x)))} />)
        )}
      </div>

      {encargados.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-fg">Tutores que postularon ({encargados.length})</h2>
          <p className="mt-1 text-xs text-fg-muted">Son encargados de este voluntariado: su postulación no cuenta en los totales de arriba.</p>
          <div className="mt-3 space-y-4">
            {encargados.map((p) => <PostulanteCard key={p.id} p={p} oportunidadTitulo={o.titulo} preguntas={o.preguntas} modo={modo} onChanged={(next) => postulantes.setData((prev) => (prev ?? []).map((x) => (x.id === next.id ? { ...x, ...next } : x)))} />)}
          </div>
        </div>
      )}

      <Modal
        open={correoOpen}
        onClose={() => setCorreoOpen(false)}
        title="Correo masivo a postulantes"
        description={o.titulo}
        footer={
          <>
            <Button variant="outline" onClick={() => setCorreoOpen(false)}>
              Cancelar
            </Button>
            <Button loading={sending} disabled={!asunto.trim() || !mensaje.trim()} onClick={enviarCorreo}>
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </>
        }
      >
        <form onSubmit={enviarCorreo} className="space-y-4">
          <Select
            aria-label="Destinatarios"
            value={destinatarios}
            onChange={(e) => setDestinatarios(e.target.value)}
            options={
              gestiona
                ? [
                    { value: "todos", label: `Todos los postulantes (${voluntarios.length})` },
                    ...(ESTADOS_POSTULACION as unknown as string[]).map((e) => ({ value: e, label: `${e} (${conteo(e)})` })),
                  ]
                : [{ value: "todos", label: "Voluntarios seleccionados de este voluntariado" }]
            }
          />
          <Input aria-label="Asunto" placeholder="Asunto del correo" value={asunto} onChange={(e) => setAsunto(e.target.value)} maxLength={200} required />
          <Textarea aria-label="Mensaje" placeholder="Escribe tu mensaje…" value={mensaje} onChange={(e) => setMensaje(e.target.value)} maxLength={5000} required />
          <Card className="bg-page p-3 text-xs text-fg-muted">
            El correo se envía desde la plataforma en nombre de tu organización. Los postulantes no verán las direcciones de los demás.
          </Card>
        </form>
      </Modal>
    </>
  );
}
