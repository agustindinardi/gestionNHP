import { getArgentinaTodayYmd } from "@/lib/argentina-time"
import { calculateLifePercentage, parseUsefulLife } from "@/lib/useful-life"

// Cálculos de la pestaña Métricas (vida útil). Función pura: recibe las filas
// crudas de Supabase y devuelve todo lo que la UI necesita ya calculado.

export type LifeStatus = "critical" | "serious" | "warning" | "good"

const DAY_MS = 86_400_000
// Ventana de lecturas para el ritmo de copias: lo reciente pesa, lo viejo no.
const RATE_WINDOW_DAYS = 180
// Con menos tiempo entre la primera y la última lectura, el ritmo no es confiable.
const MIN_RATE_SPAN_DAYS = 14
// Por debajo de esta cantidad de cambios observados, el promedio real es orientativo.
export const MIN_RELIABLE_SAMPLES = 3

interface PrinterInput {
  id: string
  name: string
  counter: number | null
  updated_at: string | null
}

export interface ChangeInput {
  change_date: string
  printer_id: string
  printer_counter: number | null
  spare_parts: {
    id: string
    code: string
    description: string
    useful_life: string | null
    category_id: string | null
    spare_part_categories: { name: string } | null
  } | null
}

interface ReadingInput {
  printer_id: string
  counter: number
  read_at: string
}

export interface RealLife {
  mean: number
  median: number
  samples: number
}

export interface PartLifeStats extends RealLife {
  sparePartId: string
  code: string
  description: string
  nominal: number | null
}

export interface LifeRow {
  key: string
  printerId: string
  printerName: string
  categoryName: string
  sparePartDescription: string
  percentage: number
  copiesUsed: number
  totalLife: number
  overdue: boolean
  status: LifeStatus
  // Fecha (YYYY-MM-DD, Argentina) en que se llegaría a la vida útil al ritmo
  // actual de la máquina; null si no hay lecturas suficientes o ya está vencida.
  estimatedChangeYmd: string | null
  daysToChange: number | null
  realLife: RealLife | null
}

export interface LifeMetrics {
  overdue: LifeRow[]
  upcoming: LifeRow[]
  partStats: PartLifeStats[]
}

export function getLifeStatus(percentage: number): LifeStatus {
  if (percentage <= 10) return "critical"
  if (percentage <= 25) return "serious"
  if (percentage <= 50) return "warning"
  return "good"
}

// change_date es DATE (día en Argentina, UTC-3 sin horario de verano).
function changeDateMs(ymd: string): number {
  return Date.parse(`${ymd}T12:00:00-03:00`)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Copias por día con el estimador de Theil–Sen (mediana de las pendientes entre
// todos los pares de lecturas). A diferencia de "última menos primera", un
// contador mal tipeado no arrastra el resultado.
export function estimateDailyRate(points: { t: number; counter: number }[]): number | null {
  if (points.length < 2) return null
  const latest = Math.max(...points.map((p) => p.t))
  const recent = points
    .filter((p) => p.t >= latest - RATE_WINDOW_DAYS * DAY_MS)
    .sort((a, b) => a.t - b.t)
  if (recent.length < 2) return null
  if ((recent[recent.length - 1].t - recent[0].t) / DAY_MS < MIN_RATE_SPAN_DAYS) return null

  const slopes: number[] = []
  for (let i = 0; i < recent.length; i++) {
    for (let j = i + 1; j < recent.length; j++) {
      const days = (recent[j].t - recent[i].t) / DAY_MS
      if (days < 1) continue // lecturas del mismo día: pendiente sin sentido
      slopes.push((recent[j].counter - recent[i].counter) / days)
    }
  }
  if (slopes.length === 0) return null

  const rate = median(slopes)
  return rate > 0 ? rate : null
}

export function buildLifeMetrics({
  printers,
  changes,
  readings,
  now = new Date(),
}: {
  printers: PrinterInput[]
  changes: ChangeInput[] // ordenados por change_date DESC
  readings: ReadingInput[]
  now?: Date
}): LifeMetrics {
  const printersById = new Map(printers.map((p) => [p.id, p]))

  // --- Lecturas por impresora: tabla de lecturas + contador de cada cambio de
  // repuesto + contador vigente.
  const pointsByPrinter = new Map<string, { t: number; counter: number }[]>()
  const addPoint = (printerId: string, t: number, counter: number | null) => {
    if (!counter || counter <= 0 || Number.isNaN(t)) return
    const list = pointsByPrinter.get(printerId) ?? []
    list.push({ t, counter })
    pointsByPrinter.set(printerId, list)
  }
  for (const r of readings) addPoint(r.printer_id, Date.parse(r.read_at), r.counter)
  for (const c of changes) addPoint(c.printer_id, changeDateMs(c.change_date), c.printer_counter)
  for (const p of printers) {
    if (p.updated_at) addPoint(p.id, Date.parse(p.updated_at), p.counter)
  }

  const rateByPrinter = new Map<string, number | null>()
  for (const [printerId, points] of pointsByPrinter) {
    rateByPrinter.set(printerId, estimateDailyRate(points))
  }

  // --- Vida útil real: en cada máquina, los cambios de una misma categoría
  // forman una secuencia (la categoría es un lugar de la máquina, con códigos
  // alternativos: 1117 / 1117N / 1117D). Lo que avanzó el contador entre un
  // cambio y el siguiente es lo que duró el repuesto puesto en el primero.
  // Los repuestos sin categoría (engranajes, bujes...) quedan afuera: una
  // máquina puede tener varios iguales en distintas posiciones, y el intervalo
  // entre dos cambios no es la vida de ninguno.
  const sequences = new Map<string, ChangeInput[]>()
  for (const change of changes) {
    const part = change.spare_parts
    if (!part?.category_id) continue
    const key = `${change.printer_id}:${part.category_id}`
    const list = sequences.get(key) ?? []
    list.push(change)
    sequences.set(key, list)
  }

  const samplesByPart = new Map<string, number[]>()
  for (const sequence of sequences.values()) {
    sequence.sort(
      (a, b) =>
        changeDateMs(a.change_date) - changeDateMs(b.change_date) ||
        (a.printer_counter ?? 0) - (b.printer_counter ?? 0)
    )
    for (let i = 0; i < sequence.length - 1; i++) {
      const current = sequence[i]
      const next = sequence[i + 1]
      const from = current.printer_counter ?? 0
      const to = next.printer_counter ?? 0
      // Contador sin cargar, el mismo día o un contador que retrocede (máquina
      // reemplazada / error de carga): no es una muestra válida.
      if (from <= 0 || to <= from) continue
      const list = samplesByPart.get(current.spare_parts!.id) ?? []
      list.push(to - from)
      samplesByPart.set(current.spare_parts!.id, list)
    }
  }

  const realLifeByPart = new Map<string, RealLife>()
  for (const [partId, samples] of samplesByPart) {
    realLifeByPart.set(partId, {
      mean: samples.reduce((sum, value) => sum + value, 0) / samples.length,
      median: median(samples),
      samples: samples.length,
    })
  }

  const partsById = new Map<string, NonNullable<ChangeInput["spare_parts"]>>()
  for (const change of changes) {
    if (change.spare_parts) partsById.set(change.spare_parts.id, change.spare_parts)
  }

  const partStats: PartLifeStats[] = Array.from(realLifeByPart, ([partId, stats]) => {
    const part = partsById.get(partId)!
    return {
      sparePartId: partId,
      code: part.code,
      description: part.description,
      nominal: part.useful_life ? parseUsefulLife(part.useful_life) : null,
      ...stats,
    }
  }).sort((a, b) => b.samples - a.samples || a.code.localeCompare(b.code))

  // --- Vida restante del último repuesto puesto en cada categoría de cada
  // máquina (misma regla que el detalle de impresora).
  const latestByCategory = new Map<string, ChangeInput>()
  for (const change of changes) {
    const part = change.spare_parts
    if (!part?.category_id || !part.useful_life || !part.spare_part_categories) continue
    const key = `${change.printer_id}:${part.category_id}`
    if (!latestByCategory.has(key)) latestByCategory.set(key, change)
  }

  const life: LifeRow[] = []
  for (const [key, change] of latestByCategory) {
    const printer = printersById.get(change.printer_id)
    const part = change.spare_parts
    if (!printer || !part?.useful_life || !part.spare_part_categories) continue

    const { percentage, copiesUsed, totalLife } = calculateLifePercentage(
      printer.counter ?? 0,
      change.printer_counter ?? 0,
      part.useful_life
    )
    // Sin una vida útil numérica no se puede calcular el porcentaje: se omite
    // en vez de mostrar un 0% engañoso.
    if (totalLife === null) continue

    const overdue = copiesUsed >= totalLife
    let estimatedChangeYmd: string | null = null
    let daysToChange: number | null = null
    const rate = rateByPrinter.get(printer.id) ?? null
    if (!overdue && rate) {
      // copiesUsed se midió con el contador vigente, cargado en updated_at.
      const base = printer.updated_at ? Date.parse(printer.updated_at) : now.getTime()
      const eta = base + ((totalLife - copiesUsed) / rate) * DAY_MS
      estimatedChangeYmd = getArgentinaTodayYmd(new Date(eta))
      daysToChange = Math.round((eta - now.getTime()) / DAY_MS)
    }

    life.push({
      key,
      printerId: printer.id,
      printerName: printer.name,
      categoryName: part.spare_part_categories.name,
      sparePartDescription: part.description,
      percentage,
      copiesUsed,
      totalLife,
      overdue,
      status: getLifeStatus(percentage),
      estimatedChangeYmd,
      daysToChange,
      realLife: realLifeByPart.get(part.id) ?? null,
    })
  }
  const usedRatio = (row: LifeRow) => row.copiesUsed / row.totalLife

  // Vencidas: las más excedidas primero (el % restante es 0 para todas).
  const overdue = life.filter((row) => row.overdue).sort((a, b) => usedRatio(b) - usedRatio(a))

  // Próximas: por fecha estimada, porque una máquina que imprime mucho llega
  // antes al límite aunque le quede más %. Las que no tienen ritmo calculable
  // van al final, ordenadas por proporción usada.
  const upcoming = life
    .filter((row) => !row.overdue)
    .sort((a, b) => {
      if (a.daysToChange !== null && b.daysToChange !== null) return a.daysToChange - b.daysToChange
      if (a.daysToChange !== null) return -1
      if (b.daysToChange !== null) return 1
      return usedRatio(b) - usedRatio(a)
    })

  return { overdue, upcoming, partStats }
}
