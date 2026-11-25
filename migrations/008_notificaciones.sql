-- Notificaciones dentro de la plataforma (campana del encabezado, web y app móvil).
-- Se generan al postular, al cambiar el estado de una postulación, al publicar
-- anuncios del foro, al evaluar al voluntario y al asignar encargados.
-- Idempotente: se puede correr más de una vez.
-- Sin FOREIGN KEY a usuarios: en la base de producción (Neon) usuarios.id no tiene
-- PRIMARY KEY/UNIQUE; el borrado al eliminar una cuenta lo hace services/cuentas.py.
CREATE TABLE IF NOT EXISTS notificaciones (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    tipo VARCHAR(40) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    texto VARCHAR(500),
    enlace VARCHAR(300),
    leida BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_notificaciones_usuario ON notificaciones (usuario_id, leida, created_at);
