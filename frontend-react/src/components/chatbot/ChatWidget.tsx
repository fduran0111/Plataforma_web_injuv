"use client";

import { Bot, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/format";

type FaqEntry = { keywords: string[]; response: string };

const FAQ: FaqEntry[] = [
  {
    keywords: ["registro", "registrarse", "crear cuenta", "inscribirse", "darse de alta", "cuenta"],
    response:
      'El registro es gratuito. Haz clic en "Crear cuenta" en la parte superior de la página y completa tus datos: nombre, correo, RUT, fecha de nacimiento y una contraseña.',
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

type Msg = { from: "user" | "bot"; text: string };

function answer(text: string): string {
  const t = text.toLowerCase();
  let best: { score: number; response: string } | null = null;
  for (const entry of FAQ) {
    const score = entry.keywords.reduce((acc, k) => (t.includes(k) ? acc + k.length : acc), 0);
    if (score > (best?.score ?? 0)) best = { score, response: entry.response };
  }
  return best?.response ?? FALLBACK;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([
    { from: "bot", text: "¡Hola! Soy el asistente de la plataforma de voluntariado INJUV. ¿En qué te puedo ayudar?" },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  function send(text: string) {
    const question = text.trim();
    if (!question) return;
    setMsgs((m) => [...m, { from: "user", text: question }]);
    setInput("");
    setTimeout(() => setMsgs((m) => [...m, { from: "bot", text: answer(question) }]), 350);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar asistente" : "Abrir asistente de ayuda"}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition",
          open ? "bg-slate-700 text-white" : "bg-brand text-white hover:bg-brand-dark",
        )}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[480px] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <div className="flex items-center gap-3 bg-brand px-4 py-3 text-white">
            <div className="rounded-full bg-white/15 p-2">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Asistente INJUV</p>
              <p className="text-xs text-white/75">Preguntas frecuentes sobre voluntariado</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {msgs.map((m, i) => (
              <div key={i} className={cn("flex", m.from === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    m.from === "user" ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-page text-fg",
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {msgs.length <= 2 && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2.5">
              {QUICK.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-xs text-fg-secondary transition hover:border-brand hover:text-brand"
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
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta…"
              className="h-10 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg placeholder:text-fg-muted focus:border-brand focus:outline-none"
            />
            <button type="submit" aria-label="Enviar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white hover:bg-brand-dark">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
