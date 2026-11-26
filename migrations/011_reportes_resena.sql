-- Reportes de reseñas: la organización reporta reseñas de voluntarios con
-- contenido indebido; el equipo INJUV las revisa en /admin/resenas.
-- Idempotente: se puede correr más de una vez.
-- Sin FOREIGN KEY a usuarios: en la base de producción (Neon) usuarios.id no tiene
-- PRIMARY KEY/UNIQUE.
CREATE TABLE IF NOT EXISTS reportes_resena (
    id SERIAL PRIMARY KEY,
    postulacion_id INTEGER NOT NULL,
    reportado_por INTEGER,
    motivo VARCHAR(40) NOT NULL,
    detalle VARCHAR(500),
    estado VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'resuelto', 'descartado')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    resuelto_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ix_reportes_resena_postulacion ON reportes_resena (postulacion_id, estado);
