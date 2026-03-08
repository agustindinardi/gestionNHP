-- Tabla de Categorías de Repuestos
CREATE TABLE IF NOT EXISTS spare_part_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agregar columnas opcionales a spare_parts
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES spare_part_categories(id) ON DELETE SET NULL;
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS useful_life TEXT;

-- Habilitar Row Level Security para categorías
ALTER TABLE spare_part_categories ENABLE ROW LEVEL SECURITY;

-- Políticas para Categorías
CREATE POLICY "Users can view their own categories" ON spare_part_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own categories" ON spare_part_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON spare_part_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON spare_part_categories FOR DELETE USING (auth.uid() = user_id);

-- Índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_spare_part_categories_user_id ON spare_part_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_category_id ON spare_parts(category_id);

-- Comentarios para documentación
COMMENT ON TABLE spare_part_categories IS 'Categorías para organizar los repuestos';
COMMENT ON COLUMN spare_parts.category_id IS 'Categoría del repuesto (opcional)';
COMMENT ON COLUMN spare_parts.useful_life IS 'Vida útil del repuesto (opcional, ej: 100.000 copias)';
