-- Datos de prueba para Neon: 4 voluntarios, 4 organizaciones, 2 admins.
-- Contraseña de TODAS estas cuentas: Prueba123!
-- Pegar completo en Neon → SQL Editor → Run.

BEGIN;

-- ============ 4 VOLUNTARIOS (rol = 'user') ============
INSERT INTO usuarios (nombre, apellido, rut, email, telefono, region, ciudad, comuna, sexo, fecha_nacimiento, password_hash, rol, created_at)
VALUES
('Camila', 'Vargas', '192345671', 'camila.vargas@correo.cl', '+56912345001', 'Metropolitana de Santiago', 'Santiago', 'Providencia', 'Femenino', '1999-04-12', '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'user', NOW()),
('Matías', 'Rojas', '204567892', 'matias.rojas@correo.cl', '+56912345002', 'Valparaíso', 'Valparaíso', 'Viña del Mar', 'Masculino', '2001-09-03', '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'user', NOW()),
('Josefa', 'Araya', '187654323', 'josefa.araya@correo.cl', '+56912345003', 'Biobío', 'Concepción', 'Concepción', 'Femenino', '2000-12-25', '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'user', NOW()),
('Ignacio', 'Fuentealba', '213456784', 'ignacio.fuentealba@correo.cl', '+56912345004', 'Los Lagos', 'Puerto Montt', 'Puerto Montt', 'Masculino', '1998-06-17', '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'user', NOW());

-- ============ 4 CUENTAS DE ORGANIZACIÓN (rol = 'organizacion') ============
INSERT INTO usuarios (nombre, apellido, rut, email, telefono, region, ciudad, comuna, sexo, fecha_nacimiento, password_hash, rol, created_at)
VALUES
('Fundación Manos', 'al Sur', '654321005', 'contacto@manosalsur.cl', '+56922345010', NULL, NULL, NULL, NULL, NULL, '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'organizacion', NOW()),
('Corporación Jóvenes', 'del Maule', '654321016', 'contacto@jovenesmaule.cl', '+56922345011', NULL, NULL, NULL, NULL, NULL, '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'organizacion', NOW()),
('ONG Sendero', 'Austral', '654321027', 'contacto@senderoaustral.cl', '+56922345012', NULL, NULL, NULL, NULL, NULL, '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'organizacion', NOW()),
('Fundación Tejido', 'Comunitario', '654321038', 'contacto@tejidocomunitario.cl', '+56922345013', NULL, NULL, NULL, NULL, NULL, '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'organizacion', NOW());

-- ============ 4 ORGANIZACIONES (vinculadas por email de su cuenta) ============
INSERT INTO organizaciones (nombre, rut, email_contacto, fecha_creacion, telefono_contacto, region, ciudad, comuna, descripcion, descripcion_breve, id_usuario_org, area_trabajo, tipo_org, created_at)
SELECT 'Fundación Manos al Sur', '65432100-5', 'contacto@manosalsur.cl', DATE '2015-03-10', '+56922345010', 'Metropolitana de Santiago', 'Santiago', 'Santiago', 'Trabajamos en programas de voluntariado juvenil para la reconstrucción de comunidades afectadas por emergencias en el sur del país.', 'Voluntariado en reconstrucción y emergencias', u.id, 'Emergencias y reconstrucción', 'Fundación', NOW()
FROM usuarios u WHERE u.email = 'contacto@manosalsur.cl'
UNION ALL
SELECT 'Corporación Jóvenes del Maule', '65432101-6', 'contacto@jovenesmaule.cl', DATE '2018-07-22', '+56922345011', 'Maule', 'Talca', 'Talca', 'Fomentamos el liderazgo juvenil rural mediante proyectos ambientales y de formación comunitaria en la región del Maule.', 'Liderazgo juvenil y ambiente en el Maule', u.id, 'Medio ambiente', 'Corporación', NOW()
FROM usuarios u WHERE u.email = 'contacto@jovenesmaule.cl'
UNION ALL
SELECT 'ONG Sendero Austral', '65432102-7', 'contacto@senderoaustral.cl', DATE '2020-11-05', '+56922345012', 'Magallanes y de la Antártica Chilena', 'Punta Arenas', 'Punta Arenas', 'Educación ambiental y conservación de la Patagonia, con expediciones de jóvenes voluntarios para limpieza y monitoreo.', 'Conservación y educación ambiental en Patagonia', u.id, 'Medio ambiente', 'ONG', NOW()
FROM usuarios u WHERE u.email = 'contacto@senderoaustral.cl'
UNION ALL
SELECT 'Fundación Tejido Comunitario', '65432103-8', 'contacto@tejidocomunitario.cl', DATE '2012-01-30', '+56922345013', 'La Araucanía', 'Temuco', 'Temuco', 'Fortalecemos comunidades de La Araucanía mediante acompañamiento educativo y talleres culturales con voluntarios.', 'Educación y comunidad en La Araucanía', u.id, 'Educación', 'Fundación', NOW()
FROM usuarios u WHERE u.email = 'contacto@tejidocomunitario.cl';

-- ============ 2 ADMINS ============
INSERT INTO usuarios (nombre, apellido, rut, email, telefono, region, ciudad, comuna, sexo, fecha_nacimiento, password_hash, rol, created_at)
VALUES
('Valentina', 'Contreras', '189876545', 'valentina.contreras@injuv.cl', '+56922345020', 'Metropolitana de Santiago', 'Santiago', 'Ñuñoa', 'Femenino', '1995-02-14', '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'admin', NOW()),
('Sebastián', 'Molina', '198765436', 'sebastian.molina@injuv.cl', '+56922345021', 'Metropolitana de Santiago', 'Santiago', 'La Florida', 'Masculino', '1993-08-27', '$2b$12$ytJ4gBqNbRddt0G/raUl6ekYHrZwNg0xbHVoESMJbEZ9MojYQHobO', 'admin', NOW());

COMMIT;
