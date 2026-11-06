export type Rol = "user" | "organizacion" | "admin";

export type CertificadoPersonal = {
  tipo: "antecedentes" | "inhabilidades";
  fecha_emision: string;
  nombre_archivo: string | null;
  subido_en: string;
};

export type Usuario = {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  rut: string;
  telefono: string;
  region: string;
  ciudad: string;
  comuna: string;
  sexo: string;
  fecha_nacimiento: string | null;
  rol: Rol;
  horas_voluntariado: number;
  tiene_foto: boolean;
  foto_version: string | null;
  certificados_personales: CertificadoPersonal[];
  created_at: string | null;
  organizacion: { id: number; nombre: string | null } | null;
};

export type EstadoOportunidad = "activa" | "abierta" | "cerrada";

export type Oportunidad = {
  id: number;
  titulo: string;
  descripcion: string;
  organizacion_id: number;
  organizacion_nombre: string;
  organizacion_tiene_logo: boolean;
  meta_postulantes: number | null;
  cupo_maximo: number | null;
  fecha_limite_postulacion: string | null;
  fecha_inicio_voluntariado: string | null;
  fecha_fin_voluntariado: string | null;
  horas_voluntariado: number | null;
  estado: EstadoOportunidad;
  responsable_nombre: string;
  responsable_apellido: string;
  responsable_email: string;
  responsable_email_institucional: string;
  responsable_telefono: string;
  region: string;
  ciudad: string;
  comuna: string;
  tipo_de_voluntariado: string;
  num_postulaciones: number;
  created_at: string | null;
  mi_postulacion?: { id: number; estado: string } | null;
};

export type Asistencia = "SI" | "No" | "No aplica";

export type PostulacionBase = {
  id: number;
  usuario_id: number;
  oportunidad_id: number;
  estado: string;
  estado_confirmacion: string;
  motivo_no_seleccion: string;
  motivo_no_seleccion_otro: string;
  asistencia_capacitacion: Asistencia;
  asistencia_actividad: Asistencia;
  horas_voluntariado: number;
  tiene_certificado: boolean;
  resena_org: string;
  resena_org_publica: boolean;
  calificacion_org: number | null;
  resena_usuario: string;
  calificacion_usuario: number | null;
  resena_usuario_publica: boolean;
  created_at: string | null;
  updated_at: string | null;
};

/** Banderas de etapa que la API agrega en las vistas del voluntario y de la organización. */
export type CicloPostulacion = {
  /** Retiró la postulación o, siendo seleccionado, indicó que no participará. */
  rechazo_participacion: boolean;
  voluntariado_terminado: boolean;
  /** Seleccionado que participa y voluntariado terminado: se habilitan certificado y evaluaciones. */
  puede_certificar_y_evaluar: boolean;
};

export type PostulacionUsuario = PostulacionBase & CicloPostulacion & {
  oportunidad_titulo: string;
  oportunidad_estado: string;
  organizacion_id: number | null;
  organizacion_nombre: string;
};

export type Postulante = PostulacionBase & CicloPostulacion & {
  usuario_nombre: string;
  usuario_email: string;
  usuario_telefono: string;
  usuario_region: string;
  usuario_comuna: string;
  usuario_sexo: string;
  usuario_rut: string;
  usuario_edad: number | null;
  usuario_tiene_foto: boolean;
};

export type Certificacion = { nombre: string; archivo: string; subido_en: string | null };

export type Organizacion = {
  id: number;
  nombre: string;
  siglas_nombre: string;
  rut?: string;
  email_contacto: string;
  telefono_contacto: string;
  region: string;
  ciudad: string;
  comuna: string;
  descripcion: string;
  descripcion_breve: string;
  area_trabajo: string;
  tipo_org: string;
  sitio_web: string;
  redes_sociales: string[];
  experiencia_anios: number | null;
  voluntarios_anuales: string;
  certificacion: Certificacion[];
  fecha_creacion: string | null;
  tiene_logo: boolean;
  logo_version: string | null;
  created_at: string | null;
  num_oportunidades?: number;
  total_postulaciones?: number;
  calificacion_promedio?: number | null;
  admin_nombre?: string | null;
  admin_email?: string | null;
};

export type ResenaOrganizacion = {
  postulacion_id: number;
  oportunidad_id: number;
  oportunidad_titulo: string;
  usuario_nombre: string;
  resena: string;
  calificacion: number | null;
  es_publica: boolean;
  fecha: string | null;
};

export type ResenaPublica = {
  postulacion_id: number;
  usuario_id: number;
  usuario_nombre: string;
  usuario_tiene_foto: boolean;
  oportunidad_titulo: string;
  organizacion_id: number;
  organizacion_nombre: string;
  resena: string;
  calificacion: number | null;
  fecha: string | null;
};

export type Noticia = {
  id: number;
  titulo: string;
  contenido: string;
  resumen: string;
  estado: "activa" | "inactiva" | "borrador";
  autor_id: number | null;
  autor_nombre: string;
  imagen: string | null;
  fecha_publicacion: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type Documento = {
  id: number;
  seccion: "biblioteca" | "academia";
  nombre_archivo: string;
  archivo_mime: string | null;
  archivo_tamano_bytes: number | null;
  autor: string;
  descripcion: string;
  fecha_edicion: string | null;
  created_at: string | null;
  organizacion_id: number | null;
  organizacion_nombre?: string;
  tematica_id?: number | null;
  tematica_nombre?: string | null;
  estado?: "pendiente" | "aprobado" | "rechazado";
  categoria?: string | null;
};

export type Tematica = { id: number; nombre: string };

export type Solicitud = {
  id: number;
  nombre: string;
  rut: string;
  email_contacto: string;
  fecha_creacion: string | null;
  region: string;
  ciudad: string;
  comuna: string;
  descripcion: string;
  sitio_web: string;
  redes_sociales: string[];
  estado: "pendiente" | "aprobada" | "rechazada";
  comentario_revision: string;
  id_usuario_org: number;
  usuario_nombre: string;
  usuario_email: string;
  revisado_por: string;
  created_at: string | null;
  reviewed_at: string | null;
};

export type Serie = { label: string; cantidad: number }[];

export type EstadisticasAdmin = {
  resumen: Record<string, number>;
  anio: number;
  usuarios_por_mes: Serie;
  oportunidades_por_mes: Serie;
  postulaciones_por_mes: Serie;
  oportunidades_por_area: Serie;
  postulaciones_por_estado: Serie;
  oportunidades_por_organizacion: Serie;
};

export type ResenaAdmin = PostulacionBase & {
  oportunidad_titulo: string;
  organizacion_nombre: string;
  usuario_nombre: string;
};
