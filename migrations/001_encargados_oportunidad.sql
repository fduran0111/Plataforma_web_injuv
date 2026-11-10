-- Encargados de cada voluntariado (ids de usuarios de la organización).
-- Solo ellos, el administrador de la organización y el admin INJUV pueden gestionar
-- el voluntariado y sus postulantes. Idempotente: se puede correr más de una vez.
ALTER TABLE oportunidades ADD COLUMN IF NOT EXISTS encargados_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
