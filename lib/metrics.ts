import { addDaysToYmd, getArgentinaTodayYmd } from "@/lib/argentina-time"
import { calculateLifePercentage } from "@/lib/useful-life"

// Agregaciones de la pestaña Métricas. Función pura: recibe las filas crudas de
// Supabase y devuelve todo lo que la UI necesita ya calculado.

export type LifeStatus = "critical" | "serious" | "warning" | "good"

export const STALE_COUNTER_DAYS = 30
export const TASKS_WINDOW_DAYS = 90
const MONTHS = 12
const TOP_N = 8
const DAY_MS = 86_400_000

interface PrinterInput {
  id: string
  name: string
  counter: number | null
  updated_at: string | null
}

export interface ChangeInput {
  change_date: string
  quantity: number | null
  printer_id: string
  printer_counter: number | null
  spare_parts: {
    id: string
    code: string
    description: string
    high_rotation: boolean | null
    useful_life: string | null
    category_id: string | null
    spare_part_categories: { name: string } | null
  } | null
}

interface TaskInput {
  due_date: string
  completed_at: string | null
  completed_by: string | null
}

export interface MonthlyPoint {
  key: string
  label: string
  fullLabel: string
  quantity: number
}

export interface RankedItem {
  id: string
  label: string
  sublabel?: string
  value: number
  title?: string
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
}

export interface MetricsData {
  partsLast30: number
  partsPrev30: number
  staleCounters: { id: string; name: string }[]
  overdueTasks: number
  monthly: MonthlyPoint[]
  topParts: RankedItem[]
  topPrinters: RankedItem[]
  life: LifeRow[]
  tasksByTech: RankedItem[]
}

export function getLifeStatus(percentage: number): LifeStatus {
  if (percentage <= 10) return "critical"
  if (percentage <= 25) return "serious"
  if (percentage <= 50) return "warning"
  return "good"
}

function monthKeys(todayYmd: string): string[] {
  const [year, month] = todayYmd.split("-").map(Number)
  const keys: string[] = []
  for (let i = MONTHS - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(year, month - 1 - i, 1))
    keys.push(`${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`)
  }
  return keys
}

function monthLabels(key: string): { label: string; fullLabel: string } {
  const [year, month] = key.split("-").map(Number)
  const date = new Date(Date.UTC(year, month - 1, 15))
  const short = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" })
    .format(date)
    .replace(".", "")
  const long = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "UTC" }).format(date)
  return {
    label: `${short} ${String(year).slice(2)}`,
    fullLabel: `${long.charAt(0).toUpperCase()}${long.slice(1)} ${year}`,
  }
}

function topN(map: Map<string, RankedItem>): RankedItem[] {
  return Array.from(map.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, TOP_N)
}

export function buildMetrics({
  printers,
  changes,
  tasks,
  now = new Date(),
}: {
  printers: PrinterInput[]
  changes: ChangeInput[] // ordenados por change_date DESC
  tasks: TaskInput[]
  now?: Date
}): MetricsData {
  const today = getArgentinaTodayYmd(now)
  const last30Start = addDaysToYmd(today, -29)
  const prev30Start = addDaysToYmd(today, -59)

  const keys = monthKeys(today)
  const windowStart = `${keys[0]}-01`
  const monthly = new Map(keys.map((key) => [key, 0]))

  const printersById = new Map(printers.map((p) => [p.id, p]))
  const partTotals = new Map<string, RankedItem>()
  const printerTotals = new Map<string, RankedItem & { changes: number }>()
  const latestByCategory = new Map<string, ChangeInput>()

  let partsLast30 = 0
  let partsPrev30 = 0

  for (const change of changes) {
    const qty = change.quantity ?? 1
    const date = change.change_date

    const monthKey = date.slice(0, 7)
    const monthTotal = monthly.get(monthKey)
    if (monthTotal !== undefined) monthly.set(monthKey, monthTotal + qty)

    if (date >= last30Start && date <= today) partsLast30 += qty
    else if (date >= prev30Start && date < last30Start) partsPrev30 += qty

    const part = change.spare_parts

    if (date >= windowStart && date <= today) {
      if (part) {
        const item = partTotals.get(part.id) ?? {
          id: part.id,
          label: part.code,
          sublabel: part.description,
          value: 0,
          title: `${part.code} — ${part.description}`,
        }
        item.value += qty
        partTotals.set(part.id, item)
      }

      const printer = printersById.get(change.printer_id)
      if (printer) {
        const item = printerTotals.get(printer.id) ?? {
          id: printer.id,
          label: printer.name,
          value: 0,
          changes: 0,
        }
        item.value += qty
        item.changes += 1
        printerTotals.set(printer.id, item)
      }
    }

    // Igual que el detalle de impresora: el cambio más reciente por categoría
    // define cuánta vida útil le queda a esa categoría en esa máquina.
    if (part?.category_id && part.useful_life && part.spare_part_categories) {
      const key = `${change.printer_id}:${part.category_id}`
      if (!latestByCategory.has(key)) latestByCategory.set(key, change)
    }
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

    life.push({
      key,
      printerId: printer.id,
      printerName: printer.name,
      categoryName: part.spare_part_categories.name,
      sparePartDescription: part.description,
      percentage,
      copiesUsed,
      totalLife,
      overdue: copiesUsed >= totalLife,
      status: getLifeStatus(percentage),
    })
  }
  // Orden por proporción usada (no por % restante): el % restante se clava en
  // 0 para todas las vencidas, y así las más excedidas quedan primero.
  life.sort((a, b) => b.copiesUsed / b.totalLife - a.copiesUsed / a.totalLife)

  const staleCutoff = now.getTime() - STALE_COUNTER_DAYS * DAY_MS
  const staleCounters = printers
    .filter((p) => !p.updated_at || Date.parse(p.updated_at) < staleCutoff)
    .map((p) => ({ id: p.id, name: p.name }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const overdueTasks = tasks.filter((t) => !t.completed_at && t.due_date < today).length

  const tasksCutoff = now.getTime() - TASKS_WINDOW_DAYS * DAY_MS
  const techCounts = new Map<string, number>([
    ["M", 0],
    ["A", 0],
    ["V", 0],
  ])
  for (const task of tasks) {
    if (!task.completed_at || Date.parse(task.completed_at) < tasksCutoff) continue
    const who = task.completed_by ?? "Sin indicar"
    techCounts.set(who, (techCounts.get(who) ?? 0) + 1)
  }
  const tasksByTech: RankedItem[] = Array.from(techCounts, ([who, value]) => ({
    id: who,
    label: who,
    value,
  })).filter((item) => item.value > 0 || ["M", "A", "V"].includes(item.id))

  return {
    partsLast30,
    partsPrev30,
    staleCounters,
    overdueTasks,
    monthly: keys.map((key) => ({ key, ...monthLabels(key), quantity: monthly.get(key) ?? 0 })),
    topParts: topN(partTotals),
    topPrinters: topN(printerTotals).map((item) => {
      const changesCount = printerTotals.get(item.id)?.changes ?? 0
      return {
        ...item,
        sublabel: `${changesCount} cambio${changesCount === 1 ? "" : "s"}`,
      }
    }),
    life,
    tasksByTech,
  }
}
