-- Plantilla de certificado propia de la organización (PDF de fondo al emitir).
ALTER TABLE organizaciones
    ADD COLUMN IF NOT EXISTS certificado_plantilla varchar(255);
