-- Mensaje fijado por el tutor en los foros de voluntariado.
ALTER TABLE foro_mensajes ADD COLUMN IF NOT EXISTS fijado boolean NOT NULL DEFAULT false;
