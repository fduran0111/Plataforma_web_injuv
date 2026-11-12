-- Feedback del cliente: varias ubicaciones, imagen de convocatoria y preguntas al postular.
-- Idempotente: se puede correr más de una vez (local y Neon).

-- Varias ubicaciones por voluntariado: [{"region": "...", "ciudad": "<provincia>", "comuna": "..."}].
-- La primera también se guarda en region_opor/ciudad_opor/comuna_opor (compatibilidad con filtros y app móvil).
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS ubicaciones JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Imagen/banner opcional de la convocatoria (nombre del archivo en imagenes_oportunidades/).
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS imagen_filename VARCHAR(255);

-- Preguntas que la organización define para postular:
-- [{"id": "p1a2b3", "texto": "...", "tipo": "si_no|alternativas|texto", "opciones": ["..."], "obligatoria": true}]
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS preguntas JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Respuestas del postulante a esas preguntas: {"<id pregunta>": "respuesta"}. Solo las ve la organización.
ALTER TABLE postulaciones ADD COLUMN IF NOT EXISTS respuestas JSONB NOT NULL DEFAULT '{}'::jsonb;
