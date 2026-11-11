"use client";

import { Bot, MessageCircle, Send, X } from "lucide-react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

type FaqEntry = { keywords: string[]; response: string };

const FAQ: FaqEntry[] = [
  {
    keywords: ["registro", "registrarse", "crear cuenta", "inscribirse", "darse de alta", "cuenta"],
    response:
      'El registro es gratuito. Entra a "Iniciar sesión" y sigue el enlace "Regístrate gratis"; luego completa tus datos: nombre, correo, RUT, fecha de nacimiento y una contraseña.',
  },
  {
    keywords: ["empezar", "comenzar", "iniciar", "cómo empezar", "primeros pasos", "por dónde empezar"],
    response:
      'Es muy sencillo: crea tu cuenta, explora los voluntariados en la sección "Oportunidades" filtrando por región o área, y postula a la que mejor se ajuste a tus intereses. Si es tu primera vez, revisa la Academia para prepararte antes de participar.',
  },
  {
    keywords: ["voluntariado", "oportunidades", "proyectos", "participar", "ayudar", "oportunidad"],
    response:
      'En "Oportunidades" encontrarás voluntariados de educación, medio ambiente, salud, emergencias, cultura, deporte y desarrollo comunitario en todo Chile. Puedes postular a varias a la vez; cada una tiene sus propios requisitos y fechas.',
  },
  {
    keywords: ["experiencia", "experiencia previa", "sin experiencia", "no tengo experiencia", "primer vez", "principiante"],
    response:
      "Sí, absolutamente. Muchas oportunidades no requieren experiencia y están pensadas para quienes recién comienzan. Lo importante es tu compromiso. Te recomendamos revisar la Academia para prepararte mejor.",
  },
  {
    keywords: ["requisitos", "edad", "necesito", "documentos", "requiere"],
    response:
      "Para la mayoría de los voluntariados solo necesitas registrarte con tu RUT. Algunos proyectos piden documentos adicionales (como certificado de antecedentes), que puedes subir en la sección Mis documentos de tu perfil. Los requisitos específicos aparecen en la descripción de cada voluntariado.",
  },
  {
    keywords: ["postular", "postulación", "postulé", "respuesta", "cuánto esperar", "tiempo de espera", "cuándo responden", "días hábiles"],
    response:
      "Cada organización revisa las postulaciones a su ritmo; en general responden entre 5 y 15 días hábiles. Te llegará un correo cuando cambie el estado y también puedes seguirlo en tu perfil, en Mis postulaciones.",
  },
  {
    keywords: ["formación", "aprender", "cursos", "talleres", "academia", "capacitación", "preparación"],
    response:
      'En la sección "Academia" hay guías, plantillas y videos sobre liderazgo, trabajo comunitario, gestión de emergencias e inclusión, entre otros temas, para prepararte antes y durante tu voluntariado.',
  },
  {
    keywords: ["beneficios", "de qué me sirve", "para qué sirve", "ventajas", "qué gano", "qué obtengo"],
    response:
      "El voluntariado te permite contribuir a tu comunidad mientras desarrollas habilidades como liderazgo, trabajo en equipo y organización. Además, conoces nuevas realidades, amplías tus redes, mejoras tu empleabilidad y puedes certificar las horas realizadas.",
  },
  {
    keywords: ["certificado", "certificación", "documento", "comprobante", "horas", "validación"],
    response:
      "Sí. Cuando la organización confirma tu participación puede emitir un certificado digital, que podrás descargar desde Mis postulaciones en tu perfil. Tus horas de voluntariado quedan registradas en tu cuenta.",
  },
  {
    keywords: ["organización", "ong", "fundación", "registrar organización", "ser anfitrión", "publicar"],
    response:
      'Las organizaciones pueden registrarse desde el enlace "Registrar mi organización" en el pie de página. Una vez aprobada la solicitud por un administrador, podrán publicar voluntariados, gestionar postulantes y emitir certificados.',
  },
  {
    keywords: ["contacto", "ayuda", "soporte", "pregunta", "duda", "problema", "problema técnico", "consulta"],
    response:
      "Para problemas técnicos o consultas sobre la plataforma, escríbenos a voluntariado@injuv.gob.cl. Te responderemos a la brevedad posible.",
  },
  {
    keywords: ["retirar", "cancelar postulación", "anular", "ya no puedo", "desistir", "retiro"],
    response:
      "Puedes retirar una postulación desde tu perfil, en Mis postulaciones, mientras esté pendiente (antes de ser seleccionada). Si ya fuiste seleccionado y no podrás asistir, avisa a la organización lo antes posible usando sus datos de contacto.",
  },
  {
    keywords: ["no me seleccionaron", "rechazado", "rechazada", "no quedé", "no fui seleccionado", "no seleccionado"],
    response:
      "No te desanimes: cada organización tiene cupos limitados. Puedes seguir postulando a otros voluntariados en Oportunidades; tus postulaciones anteriores no afectan las nuevas.",
  },
  {
    keywords: ["buscar", "encontrar", "filtrar", "búsqueda", "cómo busco"],
    response:
      "En la página de Oportunidades puedes buscar por texto y filtrar por región y área de voluntariado. También hay un buscador en la portada.",
  },
  {
    keywords: ["qué es", "qué ofrece", "sobre injuv", "plataforma", "injuv"],
    response:
      "Esta es la plataforma de voluntariado del Instituto Nacional de la Juventud (INJUV): conecta a jóvenes de Chile con organizaciones que ofrecen experiencias de voluntariado y permite certificar la participación.",
  },
];

const QUICK = ["¿Cómo me registro?", "¿Necesito experiencia previa?", "¿Cuánto tarda la respuesta?", "¿Recibo un certificado?", "¿Cómo registro mi organización?"];

const FALLBACK =
  "Puedo ayudarte con información sobre registro, cómo empezar, voluntariados disponibles, requisitos, tiempos de respuesta, formación, certificados y cómo registrar una organización. ¿Sobre qué te gustaría saber?";

type Msg = { id: number; from: "user" | "bot"; text: string };

function answer(text: string): string {
  const t = text.toLowerCase();
  let best: { score: number; response: string } | null = null;
  for (const entry of FAQ) {
    const score = entry.keywords.reduce((acc, k) => (t.includes(k) ? acc + k.length : acc), 0);
    if (score > (best?.score ?? 0)) best = { score, response: entry.response };
  }
  return best?.response ?? FALLBACK;
}

const EASE = [0.23, 1, 0.32, 1] as const;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [escribiendo, setEscribiendo] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 0, from: "bot", text: "¡Hola! Soy el asistente de la plataforma de voluntariado INJUV. ¿En qué te puedo ayudar?" },
  ]);
  const listaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // El scroll se mueve solo dentro del contenedor: nunca la página.
  useEffect(() => {
    if (open) listaRef.current?.scrollTo({ top: listaRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, escribiendo, open]);

  // Foco en el input al abrir; Escape cierra solo con el panel abierto.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => clearTimeout(timerRef.current ?? undefined), []);

  function send(text: string) {
    const question = text.trim();
    if (!question || escribiendo) return;
    setMsgs((m) => [...m, { id: idRef.current++, from: "user", text: question }]);
    setInput("");
    setEscribiendo(true);
    timerRef.current = setTimeout(() => {
      setMsgs((m) => [...m, { id: idRef.current++, from: "bot", text: answer(question) }]);
      setEscribiendo(false);
    }, 700);
  }

  return (
    <>
      <m.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente de ayuda"}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-[0_12px_28px_-10px_rgb(0_82_204/0.6)] transition-colors duration-200",
          open ? "bg-tinta text-papel" : "hover:bg-brand-dark",
        )}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE, delay: 0.4 }}
        whileTap={{ scale: 0.94 }}
      >
        <span aria-hidden className="relative h-6 w-6">
          <MessageCircle
            className={cn(
              "absolute inset-0 h-6 w-6 transition-[opacity,transform] duration-200",
              open ? "-rotate-90 opacity-0" : "rotate-0 opacity-100",
            )}
          />
          <X
            className={cn(
              "absolute inset-0 h-6 w-6 transition-[opacity,transform] duration-200",
              open ? "rotate-0 opacity-100" : "rotate-90 opacity-0",
            )}
          />
        </span>
      </m.button>

      <AnimatePresence>
        {open && (
          <m.div
            role="dialog"
            aria-label="Asistente INJUV"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: EASE } }}
            exit={{ opacity: 0, y: 8, scale: 0.98, transition: { duration: 0.15, ease: EASE } }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-24 right-5 z-50 flex h-[520px] max-h-[calc(100svh-8rem)] w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-[28px] bg-papel ring-1 ring-tinta/10 shadow-[0_24px_60px_-20px_rgb(15_27_45/0.45)] sm:w-[380px]"
          >
            <div className="flex items-center gap-3 bg-tinta px-5 py-4 text-papel">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-brand">
                <Bot className="h-5 w-5 text-white" />
                <span aria-hidden className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-tinta" />
              </div>
              <div className="flex-1">
                <p className="font-display text-base">Asistente INJUV</p>
                <p className="text-xs text-papel/70">Responde al instante</p>
              </div>
              <button
                type="button"
                aria-label="Cerrar asistente"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-papel/70 transition-colors hover:bg-papel/10 hover:text-papel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={listaRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-5">
              {msgs.map((msg, i) => {
                const ultimoBot = msg.from === "bot" && (i === msgs.length - 1 || msgs[i + 1].from !== "bot");
                return (
                  <div key={msg.id} className={cn("flex items-end gap-2", msg.from === "user" ? "justify-end" : "justify-start")}>
                    {msg.from === "bot" &&
                      (ultimoBot ? (
                        <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta text-papel">
                          <Bot className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <span aria-hidden className="w-7 shrink-0" />
                      ))}
                    <m.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: EASE }}
                      style={{ transformOrigin: msg.from === "user" ? "bottom right" : "bottom left" }}
                      className={cn(
                        "max-w-[82%] rounded-[20px] px-4 py-2.5 text-[0.9rem] leading-relaxed",
                        msg.from === "user"
                          ? "rounded-br-md bg-brand text-white"
                          : "rounded-bl-md bg-surface text-fg ring-1 ring-tinta/8 shadow-[0_1px_2px_rgb(15_27_45/0.06)]",
                      )}
                    >
                      {msg.text}
                    </m.div>
                  </div>
                );
              })}
              {escribiendo && (
                <div className="flex items-end justify-start gap-2">
                  <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-tinta text-papel">
                    <Bot className="h-3.5 w-3.5" />
                  </span>
                  <m.div
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2, ease: EASE }}
                    style={{ transformOrigin: "bottom left" }}
                    role="status"
                    aria-label="El asistente está escribiendo"
                    className="flex items-center gap-1.5 rounded-[20px] rounded-bl-md bg-surface px-4 py-3.5 text-fg ring-1 ring-tinta/8"
                  >
                    <span className="chat-punto h-1.5 w-1.5 rounded-full bg-fg-muted" />
                    <span className="chat-punto h-1.5 w-1.5 rounded-full bg-fg-muted" />
                    <span className="chat-punto h-1.5 w-1.5 rounded-full bg-fg-muted" />
                  </m.div>
                </div>
              )}
            </div>

            {msgs.length <= 2 && (
              <div className="flex flex-wrap gap-2 px-4 pb-3">
                <p className="w-full text-[11px] font-semibold uppercase tracking-wider text-fg-muted">Preguntas frecuentes</p>
                {QUICK.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={escribiendo}
                    onClick={() => send(q)}
                    className="rounded-full bg-surface px-3.5 py-1.5 text-xs font-medium text-fg-secondary ring-1 ring-tinta/12 transition-[background-color,color,box-shadow] duration-150 hover:bg-brand hover:text-white hover:ring-brand disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="p-3 pt-2"
            >
              <div className="flex items-center gap-1 rounded-full bg-surface py-1.5 pl-4 pr-1.5 ring-1 ring-tinta/12 transition-[box-shadow] focus-within:ring-2 focus-within:ring-brand">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe tu pregunta…"
                  className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-fg-muted"
                />
                <button
                  type="submit"
                  aria-label="Enviar"
                  disabled={escribiendo || !input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-[background-color,transform] duration-150 hover:bg-brand-dark active:scale-95 disabled:bg-tinta/15 disabled:text-fg-muted"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
