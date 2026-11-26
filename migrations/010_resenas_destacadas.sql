-- Reseñas del inicio elegidas por el administrador.
-- resenas_ids: ids de postulaciones elegidas por el admin para el inicio, en orden
-- (la primera es la destacada); vacío = no se muestran reseñas en el inicio.
-- Idempotente: se puede correr más de una vez.
ALTER TABLE portada_config
    ADD COLUMN IF NOT EXISTS resenas_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
