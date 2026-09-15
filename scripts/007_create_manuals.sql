-- Manuales (datos compartidos/globales de servicio por máquina)
-- A diferencia del resto de la app, estas tablas NO son por-usuario:
-- el manual es igual para todo el equipo. RLS habilitada con políticas
-- para el rol authenticated (cualquier usuario logueado lee y edita).

CREATE TABLE IF NOT EXISTS manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS manual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('error', 'codigo')),
  code TEXT NOT NULL,
  title TEXT,
  symptom TEXT,
  cause TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (dato compartido: acceso para authenticated)
ALTER TABLE manuals ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view manuals" ON manuals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert manuals" ON manuals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update manuals" ON manuals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete manuals" ON manuals FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated can view manual entries" ON manual_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert manual entries" ON manual_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update manual entries" ON manual_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete manual entries" ON manual_entries FOR DELETE TO authenticated USING (true);

-- Índices
CREATE INDEX IF NOT EXISTS idx_manual_entries_manual_id ON manual_entries(manual_id);
CREATE INDEX IF NOT EXISTS idx_manual_entries_type ON manual_entries(type);
