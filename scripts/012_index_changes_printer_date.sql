-- 012_index_changes_printer_date.sql
--
-- Optimización de rendimiento (P4).
--
-- La página de detalle de impresora y la de historial filtran spare_part_changes
-- por printer_id y ordenan por change_date DESC. Hoy existe idx_spare_part_changes_printer_id
-- (solo printer_id), así que Postgres filtra por índice pero ordena en memoria.
--
-- Este índice compuesto permite resolver el filtro Y el orden desde el mismo índice,
-- evitando el sort. El beneficio crece con el historial acumulado por impresora.
CREATE INDEX IF NOT EXISTS idx_spare_part_changes_printer_date
  ON spare_part_changes (printer_id, change_date DESC);
