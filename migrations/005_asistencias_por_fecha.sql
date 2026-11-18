-- Historial de asistencia por fecha: una fila por postulante por día.
-- La columna postulaciones.asistencia_actividad se mantiene como flag "resumen".
CREATE TABLE IF NOT EXISTS asistencias (
    postulacion_id integer NOT NULL REFERENCES postulaciones(id) ON DELETE CASCADE,
    fecha date NOT NULL,
    presente boolean NOT NULL DEFAULT true,
    registrado_por integer,
    updated_at timestamp,
    PRIMARY KEY (postulacion_id, fecha)
);

CREATE INDEX IF NOT EXISTS ix_asistencias_postulacion ON asistencias (postulacion_id);
