-- Membresía múltiple: un usuario puede ser miembro de varias organizaciones.
-- organizaciones_ids = lista de todas sus organizaciones.
-- organizacion_afiliada se mantiene como su organización "principal" (la que ve en su sesión/dashboard).
-- Idempotente: se puede correr más de una vez.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS organizaciones_ids jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE usuarios
SET organizaciones_ids = jsonb_build_array(organizacion_afiliada)
WHERE organizacion_afiliada IS NOT NULL
  AND NOT (organizaciones_ids @> jsonb_build_array(organizacion_afiliada));
