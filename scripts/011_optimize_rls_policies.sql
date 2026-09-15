-- 011_optimize_rls_policies.sql
--
-- Optimización de rendimiento de RLS (P2).
--
-- Problema: las políticas originales usan `auth.uid() = user_id`. Postgres
-- reevalúa `auth.uid()` UNA VEZ POR FILA examinada, lo que degrada las queries
-- a medida que crece la tabla (sobre todo spare_part_changes, que guarda todo
-- el historial y se escanea entero en el dashboard y en el detalle de impresora).
--
-- Solución (recomendada por Supabase): envolver la función en una subquery
-- `(select auth.uid())`. Así el planner la evalúa una sola vez (initPlan) y
-- reutiliza el resultado para todas las filas.
-- Ref: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices
--
-- Idempotente: dropea y recrea cada política. No cambia la semántica de acceso,
-- solo cómo se evalúa la condición. Aplicar en el SQL editor de Supabase.

-- ==========================================================================
-- printers
-- ==========================================================================
DROP POLICY IF EXISTS "Users can view their own printers" ON printers;
CREATE POLICY "Users can view their own printers" ON printers FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own printers" ON printers;
CREATE POLICY "Users can insert their own printers" ON printers FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own printers" ON printers;
CREATE POLICY "Users can update their own printers" ON printers FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own printers" ON printers;
CREATE POLICY "Users can delete their own printers" ON printers FOR DELETE USING ((select auth.uid()) = user_id);

-- ==========================================================================
-- spare_parts
-- ==========================================================================
DROP POLICY IF EXISTS "Users can view their own spare parts" ON spare_parts;
CREATE POLICY "Users can view their own spare parts" ON spare_parts FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own spare parts" ON spare_parts;
CREATE POLICY "Users can insert their own spare parts" ON spare_parts FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own spare parts" ON spare_parts;
CREATE POLICY "Users can update their own spare parts" ON spare_parts FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own spare parts" ON spare_parts;
CREATE POLICY "Users can delete their own spare parts" ON spare_parts FOR DELETE USING ((select auth.uid()) = user_id);

-- ==========================================================================
-- spare_part_changes
-- ==========================================================================
DROP POLICY IF EXISTS "Users can view their own spare part changes" ON spare_part_changes;
CREATE POLICY "Users can view their own spare part changes" ON spare_part_changes FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own spare part changes" ON spare_part_changes;
CREATE POLICY "Users can insert their own spare part changes" ON spare_part_changes FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own spare part changes" ON spare_part_changes;
CREATE POLICY "Users can update their own spare part changes" ON spare_part_changes FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own spare part changes" ON spare_part_changes;
CREATE POLICY "Users can delete their own spare part changes" ON spare_part_changes FOR DELETE USING ((select auth.uid()) = user_id);

-- ==========================================================================
-- spare_part_categories
-- ==========================================================================
DROP POLICY IF EXISTS "Users can view their own categories" ON spare_part_categories;
CREATE POLICY "Users can view their own categories" ON spare_part_categories FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own categories" ON spare_part_categories;
CREATE POLICY "Users can insert their own categories" ON spare_part_categories FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own categories" ON spare_part_categories;
CREATE POLICY "Users can update their own categories" ON spare_part_categories FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own categories" ON spare_part_categories;
CREATE POLICY "Users can delete their own categories" ON spare_part_categories FOR DELETE USING ((select auth.uid()) = user_id);

-- ==========================================================================
-- tasks
-- ==========================================================================
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE USING ((select auth.uid()) = user_id);
