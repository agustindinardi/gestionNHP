-- Rehace manual_entries con el esquema ampliado v2.
-- ERROR (SC): level, title, detection, causes, solution
-- CODIGO (SP): title(=nombre), description, setting
-- Se descarta y recrea la tabla (es dato de referencia, se recarga con el seed 010).
-- La tabla manuals (con la fila RICOH 7502) se conserva.

DROP TABLE IF EXISTS manual_entries;

CREATE TABLE manual_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id UUID NOT NULL REFERENCES manuals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('error', 'codigo')),
  code TEXT NOT NULL,
  level TEXT,          -- SC: nivel de severidad A/B/C/D
  title TEXT,          -- SC: nombre del error | SP: nombre del ajuste
  detection TEXT,      -- SC: condicion que lo dispara (sintoma)
  causes TEXT,         -- SC: posibles causas
  solution TEXT,       -- SC: accion/solucion
  description TEXT,    -- SP: descripcion del ajuste
  setting TEXT,        -- SP: rango / default / unidad
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE manual_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view manual entries" ON manual_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert manual entries" ON manual_entries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update manual entries" ON manual_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete manual entries" ON manual_entries FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_manual_entries_manual_id ON manual_entries(manual_id);
CREATE INDEX IF NOT EXISTS idx_manual_entries_type ON manual_entries(type);
