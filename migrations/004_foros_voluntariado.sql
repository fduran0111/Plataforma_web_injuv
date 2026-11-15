-- Foros de cada voluntariado, compartidos entre la web y la app móvil.
-- canal 'anuncios': solo publican los tutores (encargados) y el administrador de la organización.
-- canal 'chat': además pueden escribir los voluntarios seleccionados.
-- Idempotente: se puede correr más de una vez.
CREATE TABLE IF NOT EXISTS foro_mensajes (
    id SERIAL PRIMARY KEY,
    oportunidad_id INTEGER NOT NULL REFERENCES oportunidades(id) ON DELETE CASCADE,
    canal VARCHAR(10) NOT NULL DEFAULT 'chat' CHECK (canal IN ('anuncios', 'chat')),
    autor_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    texto TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_foro_mensajes_oportunidad ON foro_mensajes (oportunidad_id, canal, created_at);
