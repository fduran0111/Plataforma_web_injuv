"use client";

import { ChevronDown, ChevronUp, Download, Eye, EyeOff, FileCheck2, Mail, MapPin, MessageCircle, Phone, Send, Star, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, Avatar, Badge, Button, buttonClass, Card, Checkbox, Modal, Select, Spinner, Stars, Textarea } from "@/components/ui";
import { apiFetch, downloadFile, fileUrl } from "@/lib/api";
import { ESTADO_POSTULACION_TONE, ESTADOS_POSTULACION, MOTIVOS_NO_SELECCION } from "@/lib/constants";
import { formatDate, formatRut } from "@/lib/format";
import type { Asistencia, FichaPostulante, Postulante, PreguntaOportunidad } from "@/lib/types";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

const ASISTENCIAS: Asistencia[] = ["No aplica", "SI", "No"];

/** Teléfono chileno → número para wa.me (569XXXXXXXX). Devuelve null si no parece válido. */
function whatsappNumero(telefono: string | null | undefined): string | null {
  const d = (telefono ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("56")) return d;
  if (d.length === 9 && d.startsWith("9")) return `56${d}`;
  if (d.length === 8) return `569${d}`;
  return d.length >= 10 ? d : null;
}

export default function PostulanteCard({
  p,
  oportunidadTitulo,
  preguntas = [],
  onChanged,
  soloLectura = false,
}: {
  p: Postulante;
  oportunidadTitulo: string;
  /** Preguntas de la convocatoria, para mostrar las respuestas del postulante en la ficha. */
  preguntas?: PreguntaOportunidad[];
  onChanged: (p: Postulante) => void;
  /** Integrante que no es encargado del voluntariado: ve todo, pero no modifica. */
  soloLectura?: boolean;
}) {
  const asuntoCorreo = `Actualización estado de postulación: ${oportunidadTitulo}`;
  const mailto = `mailto:${p.usuario_email}?subject=${encodeURIComponent(asuntoCorreo)}`;
  const waNumero = whatsappNumero(p.usuario_telefono);
  const whatsapp = waNumero
    ? `https://wa.me/${waNumero}?text=${encodeURIComponent(`Hola ${p.usuario_nombre}, te escribimos por tu postulación a "${oportunidadTitulo}".`)}`
    : null;
  const toast = useToast();
  const { user } = useAuth();
  const esMiembro = user?.organizacion?.rol === "miembro";
  const certRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [estadoModal, setEstadoModal] = useState<string | null>(null);
  const [motivo, setMotivo] = useState(MOTIVOS_NO_SELECCION[0]);
  const [motivoOtro, setMotivoOtro] = useState("");
  const [resenaOpen, setResenaOpen] = useState(false);
  const [resena, setResena] = useState(p.resena_org);
  const [calificacion, setCalificacion] = useState<number | null>(p.calificacion_org);
  const [resenaPublica, setResenaPublica] = useState(p.resena_org_publica);
  const [horas, setHoras] = useState(String(p.horas_voluntariado || ""));
  const [fichaOpen, setFichaOpen] = useState(false);
  const [ficha, setFicha] = useState<FichaPostulante | null>(null);
  const [fichaLoading, setFichaLoading] = useState(false);

  async function toggleFicha() {
    setFichaOpen((o) => !o);
    if (ficha || fichaLoading) return;
    setFichaLoading(true);
    try {
      setFicha(await apiFetch<FichaPostulante>(`/postulaciones/${p.id}/ficha`));
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setFichaLoading(false);
    }
  }

  async function run(action: () => Promise<Postulante>, okMessage?: string) {
    setBusy(true);
    try {
      onChanged(await action());
      if (okMessage) toast(okMessage);
      return true;
    } catch (e) {
      toast((e as Error).message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const setAsistencia = (campo: "asistencia_capacitacion" | "asistencia_actividad", value: Asistencia) =>
    run(() => apiFetch(`/postulaciones/${p.id}/asistencia`, { method: "PATCH", body: { [campo]: value } }));

  const guardarHoras = () => {
    const value = Number(horas);
    if (Number.isNaN(value) || value < 0) return toast("Horas inválidas", "error");
    run(() => apiFetch(`/postulaciones/${p.id}/asistencia`, { method: "PATCH", body: { horas_voluntariado: value } }), "Horas registradas");
  };

  const cambiarEstado = () =>
    run(
      () =>
        apiFetch(`/postulaciones/${p.id}/estado`, {
          method: "PATCH",
          body: {
            estado: estadoModal,
            motivo_no_seleccion: estadoModal === "No seleccionado" ? motivo : null,
            motivo_no_seleccion_otro: estadoModal === "No seleccionado" && motivo === "Otro" ? motivoOtro : null,
          },
        }),
      "Estado actualizado — se notificó por correo",
    ).then((ok) => ok && setEstadoModal(null));

  const subirCertificado = async (file: File | undefined) => {
    if (!file) return;
    const body = new FormData();
    body.append("certificado", file);
    await run(() => apiFetch(`/postulaciones/${p.id}/certificado`, { method: "POST", body }), "Certificado subido");
    if (certRef.current) certRef.current.value = "";
  };

  const enviarCertificado = async () => {
    setBusy(true);
    try {
      const res = await apiFetch<{ message: string }>(`/postulaciones/${p.id}/enviar-certificado`, { method: "POST", body: {} });
      toast(res.message);
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const guardarResena = () =>
    run(
      () =>
        apiFetch(`/postulaciones/${p.id}/resena-org`, {
          method: "PUT",
          body: { resena, calificacion, es_publica: resenaPublica },
        }),
      "Reseña guardada",
    ).then((ok) => ok && setResenaOpen(false));

  const toggleVisibilidad = () =>
    run(
      () => apiFetch(`/postulaciones/${p.id}/visibilidad-resena`, { method: "PATCH", body: { es_publica: !p.resena_usuario_publica } }),
      p.resena_usuario_publica ? "Reseña ocultada del perfil público" : "Reseña publicada",
    );

  const declinada = p.estado === "Declinada por usuario";
  const noSeleccionado = p.estado === "No seleccionado";
  /** Sin participación (no seleccionado o rechazó el voluntariado): no se registra capacitación, actividad ni horas. */
  const sinParticipacion = noSeleccionado || p.rechazo_participacion;
  /** Motivo por el que el certificado y la evaluación aún no están disponibles. */
  const bloqueoCierre = p.puede_certificar_y_evaluar
    ? null
    : p.estado !== "Seleccionado" || p.rechazo_participacion
      ? "Disponible solo para seleccionados que participaron"
      : "Disponible cuando termine el voluntariado";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Avatar name={p.usuario_nombre} src={p.usuario_tiene_foto ? fileUrl.foto(p.usuario_id) : null} size={48} />
          <div>
            <p className="font-semibold text-fg">{p.usuario_nombre}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-fg-muted">
              <a href={mailto} className="flex items-center gap-1 hover:text-brand hover:underline" title="Enviar correo">
                <Mail className="h-3 w-3" /> {p.usuario_email}
              </a>
              {p.usuario_telefono &&
                (whatsapp ? (
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-brand hover:underline" title="Abrir WhatsApp">
                    <Phone className="h-3 w-3" /> {p.usuario_telefono}
                  </a>
                ) : (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {p.usuario_telefono}
                  </span>
                ))}
              {(p.usuario_comuna || p.usuario_region) && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {[p.usuario_comuna, p.usuario_region].filter(Boolean).join(", ")}
                </span>
              )}
              {p.usuario_rut && <span>RUT {formatRut(p.usuario_rut)}</span>}
              {p.usuario_edad != null && <span>{p.usuario_edad} años</span>}
            </div>
            <p className="mt-0.5 text-xs text-fg-muted">Postuló el {formatDate(p.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <Badge tone={ESTADO_POSTULACION_TONE[p.estado] ?? "neutral"}>{p.estado}</Badge>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" onClick={toggleFicha} aria-expanded={fichaOpen}>
              {fichaOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} Ficha
            </Button>
            <a href={mailto} className={buttonClass("outline", "sm")} aria-label={`Enviar correo a ${p.usuario_nombre}`}>
              <Mail className="h-4 w-4" /> Correo
            </a>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")} aria-label={`Abrir WhatsApp con ${p.usuario_nombre}`}>
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
          {p.estado === "Seleccionado" && (
            <span className="text-xs text-fg-muted">{p.estado_confirmacion === "Confirmado" ? "✓ Confirmó participación" : p.estado_confirmacion === "No confirmado" ? "No confirmó" : "Sin confirmar"}</span>
          )}
        </div>
      </div>

      {fichaOpen && (
        <div className="mt-4 rounded-xl border border-border bg-page p-4">
          {fichaLoading ? (
            <Spinner label="Cargando ficha…" />
          ) : !ficha ? (
            <p className="text-sm text-fg-muted">No se pudo cargar la ficha del postulante.</p>
          ) : (
            <>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">Ficha del postulante</h3>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Correo", ficha.email],
                  ["Teléfono", ficha.telefono],
                  ["RUT", ficha.rut ? formatRut(ficha.rut) : ""],
                  ["Región", ficha.region],
                  ["Provincia", ficha.ciudad],
                  ["Comuna", ficha.comuna],
                  ["Sexo", ficha.sexo],
                  ["Edad", ficha.edad != null ? `${ficha.edad} años` : ""],
                  ["Nacimiento", formatDate(ficha.fecha_nacimiento, "—")],
                ]
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-fg-muted">{k}</dt>
                      <dd className="text-fg">{v}</dd>
                    </div>
                  ))}
              </dl>
              {preguntas.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Respuestas al postular</p>
                  <dl className="mt-2 space-y-2 text-sm">
                    {preguntas.map((q) => (
                      <div key={q.id}>
                        <dt className="text-fg-muted">{q.texto}</dt>
                        <dd className="font-medium text-fg">{(p.respuestas ?? {})[q.id] || "Sin respuesta"}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
              <div className="mt-4 border-t border-border pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Certificados del postulante</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ficha.certificados.length === 0 && (
                    <p className="text-sm text-fg-muted">No ha subido certificados de antecedentes ni inhabilidades.</p>
                  )}
                  {ficha.certificados.map((c) => (
                    <Button
                      key={c.tipo}
                      size="sm"
                      variant="outline"
                      onClick={() => downloadFile(`/postulaciones/${p.id}/certificado-personal/${c.tipo}`, `${c.tipo}.pdf`)}
                    >
                      <FileCheck2 className="h-4 w-4" /> {c.tipo === "antecedentes" ? "Antecedentes" : "Inhabilidades"}
                      {c.fecha_emision ? ` (${formatDate(c.fecha_emision)})` : ""}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {p.rechazo_participacion && (
        <Alert tone="amber" className="mt-4">
          <strong>El postulante rechazó el voluntariado.</strong>{" "}
          {declinada
            ? "Retiró su postulación, por lo que no puedes cambiar su estado."
            : "Fue seleccionado pero indicó que no participará."}{" "}
          Capacitación, actividad y horas quedan bloqueadas.
        </Alert>
      )}
      {noSeleccionado && (
        <p className="mt-4 text-xs text-fg-muted">
          Postulante no seleccionado: capacitación, actividad y horas quedan bloqueadas. Cambia su estado para habilitarlas.
        </p>
      )}

      <fieldset disabled={soloLectura} className="m-0 min-w-0 border-0 p-0">
      <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          aria-label="Estado"
          value={p.estado}
          disabled={busy || declinada}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "No seleccionado") setEstadoModal(value);
            else
              run(() => apiFetch(`/postulaciones/${p.id}/estado`, { method: "PATCH", body: { estado: value } }), "Estado actualizado — se notificó por correo");
          }}
          options={ESTADOS_POSTULACION as unknown as string[]}
          className="h-9 text-xs"
        />
        <Select
          aria-label="Asistencia capacitación"
          value={p.asistencia_capacitacion}
          disabled={busy || sinParticipacion}
          onChange={(e) => setAsistencia("asistencia_capacitacion", e.target.value as Asistencia)}
          options={ASISTENCIAS.map((a) => ({ value: a, label: `Capacitación: ${a}` }))}
          className="h-9 text-xs"
        />
        <Select
          aria-label="Asistencia actividad"
          value={p.asistencia_actividad}
          disabled={busy || sinParticipacion}
          onChange={(e) => setAsistencia("asistencia_actividad", e.target.value as Asistencia)}
          options={ASISTENCIAS.map((a) => ({ value: a, label: `Actividad: ${a}` }))}
          className="h-9 text-xs"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            aria-label="Horas de voluntariado"
            value={horas}
            disabled={sinParticipacion}
            onChange={(e) => setHoras(e.target.value)}
            placeholder="Horas"
            className="h-9 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-xs text-fg focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button size="sm" variant="outline" loading={busy} disabled={sinParticipacion} onClick={guardarHoras}>
            Horas
          </Button>
        </div>
      </div>
      </fieldset>

      {soloLectura ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {p.tiene_certificado && (
            <Button size="sm" variant="secondary" onClick={() => downloadFile(`/postulaciones/${p.id}/certificado`, "certificado_voluntariado.pdf")}>
              <Download className="h-4 w-4" /> Ver certificado
            </Button>
          )}
          <span className="text-xs text-fg-muted">Solo lectura: no eres encargado de este voluntariado.</span>
        </div>
      ) : (
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <input ref={certRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => subirCertificado(e.target.files?.[0])} />
        {p.tiene_certificado ? (
          <>
            <Button size="sm" variant="secondary" onClick={() => downloadFile(`/postulaciones/${p.id}/certificado`, "certificado_voluntariado.pdf")}>
              <Download className="h-4 w-4" /> Ver certificado
            </Button>
            <Button size="sm" variant="outline" loading={busy} onClick={enviarCertificado}>
              <Send className="h-4 w-4" /> Enviar por correo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              loading={busy}
              onClick={() => run(() => apiFetch(`/postulaciones/${p.id}/certificado`, { method: "DELETE" }), "Certificado eliminado")}
            >
              Quitar
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="secondary"
              loading={busy}
              disabled={!!bloqueoCierre}
              title={bloqueoCierre ?? "Genera el certificado con formato estándar INJUV"}
              onClick={() => run(() => apiFetch(`/postulaciones/${p.id}/certificado/generar`, { method: "POST" }), "Certificado emitido")}
            >
              <FileCheck2 className="h-4 w-4" /> Emitir certificado
            </Button>
            <Button
              size="sm"
              variant="outline"
              loading={busy}
              disabled={!!bloqueoCierre}
              title={bloqueoCierre ?? undefined}
              onClick={() => certRef.current?.click()}
            >
              <Upload className="h-4 w-4" /> Subir PDF propio
            </Button>
          </>
        )}
        <Button size="sm" variant="ghost" disabled={!!bloqueoCierre} title={bloqueoCierre ?? undefined} onClick={() => setResenaOpen(true)}>
          <Star className="h-4 w-4" /> {p.resena_org || p.calificacion_org != null ? "Editar evaluación" : "Evaluar voluntario"}
        </Button>
        {p.resena_usuario && !esMiembro && (
          <Button size="sm" variant="ghost" loading={busy} onClick={toggleVisibilidad}>
            {p.resena_usuario_publica ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {p.resena_usuario_publica ? "Ocultar reseña" : "Publicar reseña"}
          </Button>
        )}
        {bloqueoCierre && !p.tiene_certificado && (
          <span className="text-xs text-fg-muted">Certificado y evaluación: {bloqueoCierre.toLowerCase()}.</span>
        )}
      </div>
      )}

      {(p.resena_usuario || p.resena_org || p.calificacion_org != null) && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {p.resena_usuario && (
            <div className="rounded-xl bg-page p-4">
              <p className="text-xs font-semibold uppercase text-fg-muted">Reseña del voluntario {p.resena_usuario_publica ? "(pública)" : "(oculta)"}</p>
              <div className="mt-1.5">
                <Stars value={p.calificacion_usuario} />
              </div>
              <p className="mt-1.5 text-sm text-fg-secondary">{p.resena_usuario}</p>
            </div>
          )}
          {(p.resena_org || p.calificacion_org != null) && (
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs font-semibold uppercase text-fg-muted">Tu evaluación {p.resena_org_publica ? "(visible para el voluntario)" : "(privada)"}</p>
              {p.calificacion_org != null && (
                <div className="mt-1.5">
                  <Stars value={p.calificacion_org} />
                </div>
              )}
              {p.resena_org && <p className="mt-1.5 text-sm text-fg-secondary">{p.resena_org}</p>}
            </div>
          )}
        </div>
      )}

      <Modal
        open={!!estadoModal}
        onClose={() => setEstadoModal(null)}
        title="Marcar como no seleccionado"
        description={`${p.usuario_nombre} recibirá un correo con el motivo.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setEstadoModal(null)}>
              Cancelar
            </Button>
            <Button variant="danger" loading={busy} disabled={motivo === "Otro" && motivoOtro.trim().length < 3} onClick={cambiarEstado}>
              Confirmar y notificar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select aria-label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} options={MOTIVOS_NO_SELECCION} />
          {motivo === "Otro" && (
            <Textarea aria-label="Motivo personalizado" placeholder="Escribe el motivo…" value={motivoOtro} onChange={(e) => setMotivoOtro(e.target.value)} maxLength={2000} />
          )}
        </div>
      </Modal>

      <Modal
        open={resenaOpen}
        onClose={() => setResenaOpen(false)}
        title={`Evaluar a ${p.usuario_nombre}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setResenaOpen(false)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={guardarResena}>
              Guardar evaluación
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-fg-secondary">Calificación</p>
            <Stars value={calificacion} size={26} onChange={setCalificacion} />
          </div>
          <Textarea value={resena} onChange={(e) => setResena(e.target.value)} maxLength={2000} placeholder="Comentario sobre su desempeño (opcional)…" />
          <Checkbox label="Mostrar esta evaluación al voluntario" checked={resenaPublica} onChange={(e) => setResenaPublica(e.target.checked)} />
        </div>
      </Modal>
    </Card>
  );
}
