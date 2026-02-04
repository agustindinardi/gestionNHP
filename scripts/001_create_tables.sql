-- Tabla de Impresoras
CREATE TABLE IF NOT EXISTS printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  counter INTEGER DEFAULT 0,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Repuestos
CREATE TABLE IF NOT EXISTS spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT NOT NULL,
  high_rotation BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Historial de Cambios de Repuestos
CREATE TABLE IF NOT EXISTS spare_part_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  printer_id UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES spare_parts(id) ON DELETE RESTRICT,
  change_date DATE NOT NULL,
  printer_counter INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  detail TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_changes ENABLE ROW LEVEL SECURITY;

-- Políticas para Impresoras
CREATE POLICY "Users can view their own printers" ON printers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own printers" ON printers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own printers" ON printers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own printers" ON printers FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Repuestos
CREATE POLICY "Users can view their own spare parts" ON spare_parts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own spare parts" ON spare_parts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own spare parts" ON spare_parts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own spare parts" ON spare_parts FOR DELETE USING (auth.uid() = user_id);

-- Políticas para Historial de Cambios
CREATE POLICY "Users can view their own spare part changes" ON spare_part_changes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own spare part changes" ON spare_part_changes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own spare part changes" ON spare_part_changes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own spare part changes" ON spare_part_changes FOR DELETE USING (auth.uid() = user_id);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_printers_user_id ON printers(user_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_user_id ON spare_parts(user_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_changes_user_id ON spare_part_changes(user_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_changes_printer_id ON spare_part_changes(printer_id);
CREATE INDEX IF NOT EXISTS idx_spare_part_changes_spare_part_id ON spare_part_changes(spare_part_id);
