-- Perfil extendido del voluntario: bio ("Acerca de mí") y habilidades con %.
-- Los muestran el perfil de la app y el de la web; se editan desde cualquiera.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS acerca_de text;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS habilidades jsonb NOT NULL DEFAULT '[]'::jsonb;
