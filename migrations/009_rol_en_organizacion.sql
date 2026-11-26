-- Rol dentro de la organización afiliada: 'miembro' (tutor) o 'admin' (co-administrador).
-- La dueña sigue siendo organizaciones.id_usuario_org; solo ella promueve/degrada administradores.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS organizacion_rol varchar(20) NOT NULL DEFAULT 'miembro';
