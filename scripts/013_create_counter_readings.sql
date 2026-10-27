-- 013_create_counter_readings.sql
--
-- Historial de lecturas de contador.
--
-- Hasta ahora printers.counter guardaba solo el valor actual y cada
-- actualización pisaba el anterior. Esta tabla guarda cada carga (desde el
-- formulario de una impresora o desde "Actualizar contadores") para poder
-- calcular el ritmo de copias por día de cada máquina y estimar cuándo hay que
-- cambiar cada repuesto.
--
-- Los contadores registrados en spare_part_changes.printer_counter también son
-- lecturas reales (con su fecha). No se copian acá para no duplicar datos: la
-- app los combina con esta tabla al calcular.
--
-- Idempotente. Aplicar en el SQL editor de Supabase ANTES de desplegar el código
-- que escribe en esta tabla.

CREATE TABLE IF NOT EXISTS counter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  printer_id UUID NOT NULL REFERENCES printers(id) ON DELETE CASCADE,
  counter INTEGER NOT NULL CHECK (counter >= 0),
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- single: formulario de una impresora | bulk: "Actualizar contadores" |
  -- initial: contador vigente al crear esta tabla (ver abajo)
  source TEXT NOT NULL CHECK (source IN ('single', 'bulk', 'initial')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE counter_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own counter readings" ON counter_readings;
CREATE POLICY "Users can view their own counter readings" ON counter_readings FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own counter readings" ON counter_readings;
CREATE POLICY "Users can insert their own counter readings" ON counter_readings FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own counter readings" ON counter_readings;
CREATE POLICY "Users can update their own counter readings" ON counter_readings FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own counter readings" ON counter_readings;
CREATE POLICY "Users can delete their own counter readings" ON counter_readings FOR DELETE USING ((select auth.uid()) = user_id);

CREATE INDEX IF NOT EXISTS idx_counter_readings_user_id ON counter_readings(user_id);
CREATE INDEX IF NOT EXISTS idx_counter_readings_printer_read_at ON counter_readings(printer_id, read_at DESC);

-- Guardar el contador vigente de cada impresora como primera lectura, con la
-- fecha en que se cargó (updated_at). Sin esto, la próxima actualización lo
-- pisaría y se perdería ese punto del historial.
INSERT INTO counter_readings (user_id, printer_id, counter, read_at, source)
SELECT p.user_id, p.id, p.counter, COALESCE(p.updated_at, p.created_at, NOW()), 'initial'
FROM printers p
WHERE p.counter IS NOT NULL
  AND p.counter > 0
  AND NOT EXISTS (
    SELECT 1 FROM counter_readings r WHERE r.printer_id = p.id AND r.source = 'initial'
  );
