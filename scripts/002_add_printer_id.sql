-- Agregar columna printer_id para el ID personalizado de la impresora
ALTER TABLE printers ADD COLUMN IF NOT EXISTS printer_id TEXT;

-- Crear índice único para el printer_id por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_printers_user_printer_id ON printers(user_id, printer_id);
