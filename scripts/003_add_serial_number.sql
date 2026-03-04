-- Agregar columna de número de serie a la tabla de impresoras
ALTER TABLE printers ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- Comentario para documentación
COMMENT ON COLUMN printers.serial_number IS 'Número de serie de la impresora';
