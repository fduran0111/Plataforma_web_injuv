-- Portada editable desde el panel de administración.
-- portada_config: una sola fila (id = 1) con los textos del inicio y el aviso destacado.
--   Los campos NULL usan el texto por defecto del sitio.
-- portada_fotos: fotos subidas por el admin. seccion = 'inicio' (fondo del bloque principal)
--   o 'galeria' (carrusel "Así se vive el voluntariado"). Si no hay fotos activas de una
--   sección, el sitio usa sus fotos por defecto.
-- Idempotente: se puede correr más de una vez.
CREATE TABLE IF NOT EXISTS portada_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    etiqueta VARCHAR(120),
    titulo_linea1 VARCHAR(80),
    titulo_linea2 VARCHAR(80),
    titulo_resaltado VARCHAR(80),
    subtitulo VARCHAR(300),
    aviso_activo BOOLEAN NOT NULL DEFAULT FALSE,
    aviso_texto VARCHAR(200),
    aviso_enlace VARCHAR(300),
    updated_at TIMESTAMP
);

INSERT INTO portada_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS portada_fotos (
    id SERIAL PRIMARY KEY,
    seccion VARCHAR(20) NOT NULL CHECK (seccion IN ('inicio', 'galeria')),
    archivo VARCHAR(255) NOT NULL,
    alt VARCHAR(200) NOT NULL DEFAULT '',
    orden INTEGER NOT NULL DEFAULT 0,
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS portada_fotos_seccion_orden ON portada_fotos (seccion, orden);

-- Foto original sin recortar, para poder volver a encuadrarla sin perder calidad.
ALTER TABLE portada_fotos ADD COLUMN IF NOT EXISTS archivo_original VARCHAR(255);
