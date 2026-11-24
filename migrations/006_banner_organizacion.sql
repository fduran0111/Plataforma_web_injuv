-- Foto de portada (banner) de la página pública de cada organización.
ALTER TABLE organizaciones ADD COLUMN IF NOT EXISTS banner_filename varchar(255);
