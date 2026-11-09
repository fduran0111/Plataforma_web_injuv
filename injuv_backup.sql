--
-- PostgreSQL database dump
--

\restrict EPLglRMIgpKNoyEe8b5V3L3VDwqlxD77R7KuPmNV0YftUBtEcyGdeupIrSv4RAj

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: academia_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academia_documentos (
    id integer NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    archivo_filename character varying(255) NOT NULL,
    archivo_mime character varying(120),
    archivo_tamano_bytes bigint,
    autor character varying(150),
    fecha_edicion timestamp without time zone,
    descripcion character varying(500),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    organizacion_id integer,
    categoria character varying(80),
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL
);


--
-- Name: academia_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.academia_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: academia_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.academia_documentos_id_seq OWNED BY public.academia_documentos.id;


--
-- Name: biblioteca_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biblioteca_documentos (
    id integer NOT NULL,
    nombre_archivo character varying(255) NOT NULL,
    archivo_filename character varying(255) NOT NULL,
    archivo_mime character varying(120),
    archivo_tamano_bytes bigint,
    autor character varying(150),
    fecha_edicion timestamp without time zone,
    descripcion character varying(500),
    tematica_id integer,
    organizacion_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: biblioteca_documentos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.biblioteca_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biblioteca_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.biblioteca_documentos_id_seq OWNED BY public.biblioteca_documentos.id;


--
-- Name: biblioteca_tematicas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.biblioteca_tematicas (
    id integer NOT NULL,
    nombre character varying(80) NOT NULL
);


--
-- Name: biblioteca_tematicas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.biblioteca_tematicas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: biblioteca_tematicas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.biblioteca_tematicas_id_seq OWNED BY public.biblioteca_tematicas.id;


--
-- Name: noticias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.noticias (
    id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    contenido text NOT NULL,
    resumen character varying(500),
    autor_id integer,
    estado character varying(20) DEFAULT 'activa'::character varying,
    imagen_noticia character varying(500),
    fecha_publicacion timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: noticias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.noticias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: noticias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.noticias_id_seq OWNED BY public.noticias.id;


--
-- Name: oportunidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.oportunidades (
    id integer NOT NULL,
    organizacion_id integer NOT NULL,
    titulo character varying(200) NOT NULL,
    descripcion text NOT NULL,
    meta_postulantes integer,
    cupo_maximo integer,
    fecha_limite_postulacion date,
    fecha_inicio_voluntariado date,
    fecha_fin_voluntariado date,
    horas_voluntariado integer,
    estado character varying(20),
    responsable_nombre character varying(50),
    responsable_apellido character varying(50),
    responsable_email character varying(255),
    responsable_email_institucional character varying(255),
    responsable_telefono character varying(30),
    region_opor character varying(255),
    ciudad_opor character varying(255),
    comuna_opor character varying(255),
    tipo_de_voluntariado character varying(100),
    created_at timestamp without time zone
);


--
-- Name: oportunidades_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.oportunidades_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: oportunidades_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.oportunidades_id_seq OWNED BY public.oportunidades.id;


--
-- Name: organizaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizaciones (
    id integer NOT NULL,
    nombre character varying(100),
    siglas_nombre character varying(100),
    documentos_legales jsonb DEFAULT '[]'::jsonb,
    rut character varying(20),
    email_contacto character varying(150),
    fecha_creacion date,
    telefono_contacto character varying(20),
    region character varying(100),
    ciudad character varying(100),
    comuna character varying(100),
    descripcion text,
    descripcion_breve character varying(500),
    id_usuario_org integer,
    area_trabajo character varying(100),
    tipo_org character varying(100),
    sitio_web text,
    redes_sociales jsonb DEFAULT '[]'::jsonb,
    experiencia_anios integer,
    voluntarios_anuales character varying(100),
    certificacion jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone,
    id_usuario_admin integer,
    logo_filename character varying(255)
);


--
-- Name: organizaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.organizaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: organizaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.organizaciones_id_seq OWNED BY public.organizaciones.id;


--
-- Name: postulaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.postulaciones (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    oportunidad_id integer NOT NULL,
    estado character varying(50),
    motivo_no_seleccion character varying(255),
    motivo_no_seleccion_otro text,
    estado_confirmacion character varying(20),
    asistencia_capacitacion character varying(20),
    asistencia_actividad character varying(20),
    tiene_certificado boolean,
    ruta_certificado_pdf text,
    resena_org_sobre_voluntario text,
    resena_org_publica boolean,
    calificacion_org numeric(3,1),
    "reseña_org" text,
    horas_voluntariado integer DEFAULT 0,
    resena_usuario_publica boolean DEFAULT true,
    "reseña_organizacion" text,
    calificacion_usuario_org numeric(3,1),
    resena_usuario_sobre_org text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


--
-- Name: COLUMN postulaciones.resena_usuario_publica; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.postulaciones.resena_usuario_publica IS 'Indica si la reseña del usuario sobre la organización es pública (true) o privada (false). Por defecto es pública.';


--
-- Name: postulaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.postulaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: postulaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.postulaciones_id_seq OWNED BY public.postulaciones.id;


--
-- Name: solicitudes_organizacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes_organizacion (
    id integer NOT NULL,
    nombre character varying(150) NOT NULL,
    rut character varying(20),
    email_contacto character varying(150),
    fecha_creacion date,
    region character varying(100) NOT NULL,
    ciudad character varying(100) NOT NULL,
    comuna character varying(100) NOT NULL,
    descripcion text NOT NULL,
    sitio_web text,
    redes_sociales jsonb DEFAULT '[]'::jsonb,
    id_usuario_org integer NOT NULL,
    estado character varying(20) DEFAULT 'pendiente'::character varying NOT NULL,
    comentario_revision text,
    revisado_por_admin_id integer,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: solicitudes_organizacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitudes_organizacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_organizacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitudes_organizacion_id_seq OWNED BY public.solicitudes_organizacion.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(100),
    apellido character varying(100),
    rut character varying(20),
    email character varying(150),
    telefono character varying(20),
    region character varying(100),
    ciudad character varying(100),
    comuna character varying(100),
    sexo character varying(100),
    fecha_nacimiento date,
    password_hash character varying(255),
    rol character varying(100),
    hora_voluntariado integer,
    certificado_voluntariado jsonb DEFAULT '[]'::jsonb,
    certificado_personales jsonb DEFAULT '[]'::jsonb,
    organizacion_afiliada integer,
    created_at timestamp without time zone,
    foto_perfil character varying(255)
);


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: academia_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academia_documentos ALTER COLUMN id SET DEFAULT nextval('public.academia_documentos_id_seq'::regclass);


--
-- Name: biblioteca_documentos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biblioteca_documentos ALTER COLUMN id SET DEFAULT nextval('public.biblioteca_documentos_id_seq'::regclass);


--
-- Name: biblioteca_tematicas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biblioteca_tematicas ALTER COLUMN id SET DEFAULT nextval('public.biblioteca_tematicas_id_seq'::regclass);


--
-- Name: noticias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noticias ALTER COLUMN id SET DEFAULT nextval('public.noticias_id_seq'::regclass);


--
-- Name: oportunidades id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades ALTER COLUMN id SET DEFAULT nextval('public.oportunidades_id_seq'::regclass);


--
-- Name: organizaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizaciones ALTER COLUMN id SET DEFAULT nextval('public.organizaciones_id_seq'::regclass);


--
-- Name: postulaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones ALTER COLUMN id SET DEFAULT nextval('public.postulaciones_id_seq'::regclass);


--
-- Name: solicitudes_organizacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_organizacion ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_organizacion_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: academia_documentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.academia_documentos (id, nombre_archivo, archivo_filename, archivo_mime, archivo_tamano_bytes, autor, fecha_edicion, descripcion, created_at, updated_at, organizacion_id, categoria, estado) FROM stdin;
1	Guia de la ayuda ideal para personas damnificadas	academia_20260413_224836_85dc022c.pdf	application/pdf	20045318	\N	2026-04-14 00:00:00	Documento orientado a brindar orientación práctica para la atención y apoyo a personas damnificadas en situaciones de emergencia. Incluye lineamientos sobre organización de ayuda, priorización de necesidades, coordinación con voluntarios y recomendaciones para una respuesta eficiente y oportuna.	2026-04-13 22:48:36.133419	2026-04-13 22:49:02.448677	1	guias_manuales	aprobado
\.


--
-- Data for Name: biblioteca_documentos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.biblioteca_documentos (id, nombre_archivo, archivo_filename, archivo_mime, archivo_tamano_bytes, autor, fecha_edicion, descripcion, tematica_id, organizacion_id, created_at, updated_at) FROM stdin;
1	Manual del voluntariado 2026	20260413_233354_GPI_2025-II_Tecnica_Valor_Ganado-EVM_-19Agosto2025.pdf	application/pdf	7057623	Manuel osorio	2026-04-14 00:00:00	aqui encontrara todo lo necesario y normas para cumplir como voluntario	3	1	2026-04-13 23:33:54.036282	2026-04-13 23:33:54.036288
\.


--
-- Data for Name: biblioteca_tematicas; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.biblioteca_tematicas (id, nombre) FROM stdin;
1	Voluntariado
2	Medio Ambiente
3	Educación
4	Salud
5	Emergencia
6	Noticias
7	Desarrollo Comunitario
8	Cultura
9	Deportes
\.


--
-- Data for Name: noticias; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.noticias (id, titulo, contenido, resumen, autor_id, estado, imagen_noticia, fecha_publicacion, created_at, updated_at) FROM stdin;
1	Exito en voluntarios activos	La plataforma digital impulsada por INJUV ha demostrado ser un avance significativo en la promoción y gestión del voluntariado a nivel nacional. Gracias a la implementación de nuevas herramientas tecnológicas, se ha facilitado la conexión entre organizaciones y voluntarios, permitiendo una participación más activa, organizada y eficiente.\n\nDurante el último año, el sistema ha optimizado los procesos de inscripción, seguimiento y comunicación, lo que ha contribuido directamente al aumento del 35% en la participación de voluntarios activos. Este crecimiento refleja no solo el interés de la comunidad por involucrarse en iniciativas sociales, sino también la efectividad de la plataforma como canal de coordinación.\n\nAdemás, se han incorporado funcionalidades como perfiles personalizados, gestión de actividades, notificaciones en tiempo real y acceso a información relevante, lo que mejora la experiencia del usuario y fomenta la permanencia en las actividades de voluntariado.\n\nDesde INJUV, se destaca que este logro es resultado del trabajo colaborativo entre equipos técnicos, organizaciones y la comunidad. Se espera que, en los próximos meses, la plataforma continúe evolucionando con nuevas mejoras, ampliando su alcance y fortaleciendo el ecosistema de voluntariado en el país.\n\nEste avance consolida a INJUV como un actor clave en la promoción de la participación juvenil y el desarrollo social, utilizando la tecnología como una herramienta fundamental para generar impacto positivo en la sociedad.	Gracias a la plataforma revolucionaria por parte de INJUV, se ha logrado un crecimiento de voluntariados de un 35% a comparación del año pasado.	\N	activa	noticia_20260413_224549_927e4e03.jpg	2026-04-14 09:00:00	2026-04-13 22:45:49.444436	2026-04-13 22:45:49.444438
\.


--
-- Data for Name: oportunidades; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.oportunidades (id, organizacion_id, titulo, descripcion, meta_postulantes, cupo_maximo, fecha_limite_postulacion, fecha_inicio_voluntariado, fecha_fin_voluntariado, horas_voluntariado, estado, responsable_nombre, responsable_apellido, responsable_email, responsable_email_institucional, responsable_telefono, region_opor, ciudad_opor, comuna_opor, tipo_de_voluntariado, created_at) FROM stdin;
1	1	Colecta de suminstros a personas damnificadas	Voluntariado para la colecta de alimentos no perecibles y entrega de ello a personas damnificadas	12	7	2026-04-15	2026-04-20	2026-04-25	20	cerrada	Juan	Menendez	menendez@gmail.com	j.menedez@crd.cl	95065136	\N	\N	\N	Comunidad	2026-04-12 12:20:12.368982
2	2	Apoyo a comunidad haitiana	Este nuevo voluntariado comenzaremos con una ayuda a las tomas de maipu, llevando material para casas que esten por caer y entregaremos suministros alimenticios	500	9	2026-11-06	2026-11-06	2026-11-06	23	cerrada	carolina	herrera	carolina.herrera@gmail.com	c.herrera@piso.cl	95651364	Metropolitana de Santiago	Santiago	Maipú	Comunidad	2026-11-05 20:33:40.449197
\.


--
-- Data for Name: organizaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.organizaciones (id, nombre, siglas_nombre, documentos_legales, rut, email_contacto, fecha_creacion, telefono_contacto, region, ciudad, comuna, descripcion, descripcion_breve, id_usuario_org, area_trabajo, tipo_org, sitio_web, redes_sociales, experiencia_anios, voluntarios_anuales, certificacion, created_at, id_usuario_admin, logo_filename) FROM stdin;
1	Fundacion cree en ti	\N	[]	778864869	lopez@gmail.com	2015-12-15	\N	Araucanía	Cautín	Freire	Somos una fundacion dedicada a la ayuda de personas con daños por incendios (ej: gente sin sensibilidad sensorial) para la inclusion social	\N	\N	\N	\N	\N	[]	\N	\N	[]	2026-04-12 12:07:49.922912	\N	\N
2	Fundacion suelo para chile	\N	[]	759856321	fduran@gmail.com	2019-09-15	\N	Metropolitana de Santiago	santiago	providencia	Somos una fundacion sin fines de lucro para ayudar a las familias damnificadas	\N	6	\N	\N	\N	[]	\N	\N	[]	2026-11-05 20:30:01.368733	\N	\N
\.


--
-- Data for Name: postulaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.postulaciones (id, usuario_id, oportunidad_id, estado, motivo_no_seleccion, motivo_no_seleccion_otro, estado_confirmacion, asistencia_capacitacion, asistencia_actividad, tiene_certificado, ruta_certificado_pdf, resena_org_sobre_voluntario, resena_org_publica, calificacion_org, "reseña_org", horas_voluntariado, resena_usuario_publica, "reseña_organizacion", calificacion_usuario_org, resena_usuario_sobre_org, created_at, updated_at) FROM stdin;
2	6	2	Seleccionado	No cuenta con la experiencia suficiente	\N	No confirmado	No aplica	No aplica	f	\N	\N	f	\N	\N	0	\N	\N	\N	\N	2026-11-05 20:36:13.327781	2026-11-05 21:37:01.334633
1	6	1	Seleccionado	\N	\N	Confirmado	SI	No aplica	f	\N	buen sujeto pero venezolano	t	3.0	muy buen voluntariado, buenos valores adquiridos y buena organización en terreno	20	t	\N	3.5	\N	2026-04-13 16:47:30.600584	2026-11-06 20:45:25.314316
3	10	2	Seleccionado	\N	\N	Confirmado	SI	SI	t	certificado_3_20261106_210310.pdf	\N	f	\N	\N	25	\N	\N	\N	\N	2026-11-06 20:24:14.12743	2026-11-06 21:03:10.543492
\.


--
-- Data for Name: solicitudes_organizacion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.solicitudes_organizacion (id, nombre, rut, email_contacto, fecha_creacion, region, ciudad, comuna, descripcion, sitio_web, redes_sociales, id_usuario_org, estado, comentario_revision, revisado_por_admin_id, reviewed_at, created_at, updated_at) FROM stdin;
1	Fundacion suelo para chile	759856321	fduran@gmail.com	2019-09-15	Metropolitana de Santiago	santiago	providencia	Somos una fundacion sin fines de lucro para ayudar a las familias damnificadas	\N	[]	10	aprobada	\N	8	2026-11-05 20:30:01.369407	2026-11-05 20:18:58.288774	2026-11-05 20:30:01.378847
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, apellido, rut, email, telefono, region, ciudad, comuna, sexo, fecha_nacimiento, password_hash, rol, hora_voluntariado, certificado_voluntariado, certificado_personales, organizacion_afiliada, created_at, foto_perfil) FROM stdin;
1	francisco	duran	214311178	fran@gmail.com	\N	\N	\N	\N	\N	2003-11-01	scrypt:32768:8:1$QwtXOtOTIXbkSxvd$1859923a1743c0ad4c84a391395537a7701d3ddc217a1a7483b5ed9e301d5ca9a5dd0b2ad0b0578212aa8a8b412c220496b2e8893a46d4ea8ca487c598190fbf	admin	\N	[]	[]	\N	2026-03-16 13:00:03.405757	user_1_20260413_184312_872e8d9e.png
8	Admin	Sistema	\N	admin@injuv.cl	\N	\N	\N	\N	\N	\N	$2b$12$5Hv/LOM4EeT6vPu/0clID.WSlSnHolv9zzHZ9HOMpJAW/fPKR4XaW	admin	\N	[]	[]	\N	2026-10-26 22:38:45.359634	\N
9	QA	Prueba	111111111	qa+1793152092339@test.cl	\N	\N	\N	\N	\N	1995-01-01	$2b$12$af5oghKAd6FyltmyfIn/F.XbtiEXFeQu9/UXEeS2ueZezLZlnEOTi	user	0	[]	[]	\N	2026-10-27 22:48:12.704067	\N
6	carlos	linares	143386740	linares@gmail.com	\N	\N	\N	\N	\N	2003-01-01	$2b$12$Yhdy9igXawvpSVB1oGlan.Qy6tu2O7cHoaZLdhPWSyN5sHVRq1NVC	organizacion	20	[]	[]	\N	2026-04-13 16:30:07.596645	\N
10	francisco	duran	210562583	fduran@gmail.com	56950651364	Metropolitana de Santiago	Santiago	La Florida	Masculino	2003-11-01	$2b$12$2fogn5YQnsCRAIuyz4NmfuV6/Y2au.Bk2pnOaTfc8ohkcgDMjw55.	user	25	[]	[{"tipo": "antecedentes", "archivo": "antecedentes_10_20261106_202233_d9714a44.pdf", "subido_en": "2026-11-06T20:22:33", "fecha_emision": "2026-10-15", "nombre_archivo": "boleta_devin_octubre_fduran.pdf"}, {"tipo": "inhabilidades", "archivo": "inhabilidades_10_20261106_202244_33f430e1.pdf", "subido_en": "2026-11-06T20:22:44", "fecha_emision": "2026-10-15", "nombre_archivo": "CARTA PRESENTACIÓN FRANCISCO STUARDO DURÁN GONZÁLEZ.pdf"}]	\N	2026-11-05 20:17:07.878464	user_10_20261106_201823_2e65ff45.png
\.


--
-- Name: academia_documentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.academia_documentos_id_seq', 1, true);


--
-- Name: biblioteca_documentos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.biblioteca_documentos_id_seq', 1, true);


--
-- Name: biblioteca_tematicas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.biblioteca_tematicas_id_seq', 9, true);


--
-- Name: noticias_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.noticias_id_seq', 2, true);


--
-- Name: oportunidades_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.oportunidades_id_seq', 2, true);


--
-- Name: organizaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.organizaciones_id_seq', 2, true);


--
-- Name: postulaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.postulaciones_id_seq', 3, true);


--
-- Name: solicitudes_organizacion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.solicitudes_organizacion_id_seq', 1, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 10, true);


--
-- Name: academia_documentos academia_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academia_documentos
    ADD CONSTRAINT academia_documentos_pkey PRIMARY KEY (id);


--
-- Name: biblioteca_documentos biblioteca_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biblioteca_documentos
    ADD CONSTRAINT biblioteca_documentos_pkey PRIMARY KEY (id);


--
-- Name: biblioteca_tematicas biblioteca_tematicas_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biblioteca_tematicas
    ADD CONSTRAINT biblioteca_tematicas_nombre_key UNIQUE (nombre);


--
-- Name: biblioteca_tematicas biblioteca_tematicas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biblioteca_tematicas
    ADD CONSTRAINT biblioteca_tematicas_pkey PRIMARY KEY (id);


--
-- Name: noticias noticias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noticias
    ADD CONSTRAINT noticias_pkey PRIMARY KEY (id);


--
-- Name: oportunidades oportunidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_pkey PRIMARY KEY (id);


--
-- Name: organizaciones organizaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizaciones
    ADD CONSTRAINT organizaciones_pkey PRIMARY KEY (id);


--
-- Name: postulaciones postulaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT postulaciones_pkey PRIMARY KEY (id);


--
-- Name: solicitudes_organizacion solicitudes_organizacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_organizacion
    ADD CONSTRAINT solicitudes_organizacion_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_academia_documentos_organizacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_academia_documentos_organizacion ON public.academia_documentos USING btree (organizacion_id);


--
-- Name: idx_biblioteca_documentos_fecha_edicion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biblioteca_documentos_fecha_edicion ON public.biblioteca_documentos USING btree (fecha_edicion);


--
-- Name: idx_biblioteca_documentos_organizacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biblioteca_documentos_organizacion ON public.biblioteca_documentos USING btree (organizacion_id);


--
-- Name: idx_biblioteca_documentos_tematica; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_biblioteca_documentos_tematica ON public.biblioteca_documentos USING btree (tematica_id);


--
-- Name: idx_noticias_autor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_noticias_autor_id ON public.noticias USING btree (autor_id);


--
-- Name: idx_noticias_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_noticias_estado ON public.noticias USING btree (estado);


--
-- Name: idx_noticias_fecha_publicacion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_noticias_fecha_publicacion ON public.noticias USING btree (fecha_publicacion);


--
-- Name: idx_oportunidades_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_estado ON public.oportunidades USING btree (estado);


--
-- Name: idx_oportunidades_fecha_limite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_fecha_limite ON public.oportunidades USING btree (fecha_limite_postulacion);


--
-- Name: idx_oportunidades_organizacion_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_oportunidades_organizacion_id ON public.oportunidades USING btree (organizacion_id);


--
-- Name: idx_organizaciones_id_usuario_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_organizaciones_id_usuario_org ON public.organizaciones USING btree (id_usuario_org);


--
-- Name: idx_postulaciones_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postulaciones_estado ON public.postulaciones USING btree (estado);


--
-- Name: idx_postulaciones_oportunidad_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postulaciones_oportunidad_id ON public.postulaciones USING btree (oportunidad_id);


--
-- Name: idx_postulaciones_usuario_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_postulaciones_usuario_id ON public.postulaciones USING btree (usuario_id);


--
-- Name: idx_solicitudes_organizacion_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_organizacion_estado ON public.solicitudes_organizacion USING btree (estado);


--
-- Name: idx_solicitudes_organizacion_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitudes_organizacion_usuario ON public.solicitudes_organizacion USING btree (id_usuario_org);


--
-- Name: academia_documentos academia_documentos_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academia_documentos
    ADD CONSTRAINT academia_documentos_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id) ON DELETE CASCADE;


--
-- Name: biblioteca_documentos biblioteca_documentos_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biblioteca_documentos
    ADD CONSTRAINT biblioteca_documentos_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id) ON DELETE SET NULL;


--
-- Name: biblioteca_documentos biblioteca_documentos_tematica_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.biblioteca_documentos
    ADD CONSTRAINT biblioteca_documentos_tematica_id_fkey FOREIGN KEY (tematica_id) REFERENCES public.biblioteca_tematicas(id) ON DELETE SET NULL;


--
-- Name: organizaciones fk_organizaciones_usuario_admin; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizaciones
    ADD CONSTRAINT fk_organizaciones_usuario_admin FOREIGN KEY (id_usuario_admin) REFERENCES public.usuarios(id);


--
-- Name: noticias noticias_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.noticias
    ADD CONSTRAINT noticias_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.usuarios(id);


--
-- Name: oportunidades oportunidades_organizacion_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.oportunidades
    ADD CONSTRAINT oportunidades_organizacion_id_fkey FOREIGN KEY (organizacion_id) REFERENCES public.organizaciones(id);


--
-- Name: organizaciones organizaciones_id_usuario_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizaciones
    ADD CONSTRAINT organizaciones_id_usuario_org_fkey FOREIGN KEY (id_usuario_org) REFERENCES public.usuarios(id);


--
-- Name: postulaciones postulaciones_oportunidad_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT postulaciones_oportunidad_id_fkey FOREIGN KEY (oportunidad_id) REFERENCES public.oportunidades(id);


--
-- Name: postulaciones postulaciones_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.postulaciones
    ADD CONSTRAINT postulaciones_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: solicitudes_organizacion solicitudes_organizacion_id_usuario_org_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_organizacion
    ADD CONSTRAINT solicitudes_organizacion_id_usuario_org_fkey FOREIGN KEY (id_usuario_org) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: solicitudes_organizacion solicitudes_organizacion_revisado_por_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_organizacion
    ADD CONSTRAINT solicitudes_organizacion_revisado_por_admin_id_fkey FOREIGN KEY (revisado_por_admin_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict EPLglRMIgpKNoyEe8b5V3L3VDwqlxD77R7KuPmNV0YftUBtEcyGdeupIrSv4RAj

