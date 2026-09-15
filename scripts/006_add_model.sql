-- Agregar columna de modelo a la tabla de impresoras
ALTER TABLE printers ADD COLUMN IF NOT EXISTS model TEXT;

-- Comentario para documentación
COMMENT ON COLUMN printers.model IS 'Modelo de la impresora';
