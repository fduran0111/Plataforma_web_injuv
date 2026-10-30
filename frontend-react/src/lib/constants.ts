export const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana de Santiago",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén del General Carlos Ibáñez del Campo",
  "Magallanes y de la Antártica Chilena",
];

export const AREAS_VOLUNTARIADO = [
  "Educación",
  "Comunidad",
  "Medio Ambiente",
  "Salud",
  "Deporte",
  "Cultura",
  "Emergencia",
  "Desarrollo Social",
  "Tecnología",
  "Arte",
  "Animales",
  "Adultos Mayores",
  "Niños y Jóvenes",
  "Discapacidad",
];

export const ESTADOS_POSTULACION = [
  "Pendiente de revisión",
  "Pre-seleccionado",
  "Etapa de entrevista",
  "En lista de espera",
  "Seleccionado",
  "No seleccionado",
] as const;

export const MOTIVOS_NO_SELECCION = [
  "Cupos completos",
  "No cumple con el perfil requerido",
  "Disponibilidad horaria incompatible",
  "Postulación incompleta",
  "Otro",
];

export type Tone = "neutral" | "blue" | "green" | "red" | "amber" | "violet" | "slate";

export const ESTADO_POSTULACION_TONE: Record<string, Tone> = {
  "Pendiente de revisión": "amber",
  "Pre-seleccionado": "blue",
  "Etapa de entrevista": "violet",
  "En lista de espera": "slate",
  Seleccionado: "green",
  "No seleccionado": "red",
  "Declinada por usuario": "neutral",
};

export const ESTADO_OPORTUNIDAD: Record<string, { label: string; tone: Tone }> = {
  activa: { label: "Abierta", tone: "green" },
  abierta: { label: "Abierta", tone: "green" },
  cerrada: { label: "Cerrada", tone: "slate" },
};

export const CATEGORIAS_ACADEMIA: Record<string, string> = {
  guias_manuales: "Guías y manuales",
  plantillas_formatos: "Plantillas y formatos",
  videos_tutoriales: "Videos tutoriales",
};

export const ESTADO_DOC_TONE: Record<string, Tone> = {
  pendiente: "amber",
  aprobado: "green",
  rechazado: "red",
};

export const ROL_LABEL: Record<string, string> = {
  user: "Voluntario/a",
  organizacion: "Organización",
  admin: "Administrador",
};
