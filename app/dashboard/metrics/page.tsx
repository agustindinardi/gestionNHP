import Link from "next/link"
import { AlertOctagon, CalendarClock, ClipboardX, Gauge, Package, type LucideIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buildMetrics, STALE_COUNTER_DAYS, TASKS_WINDOW_DAYS, type ChangeInput } from "@/lib/metrics"
import { formatNumber } from "@/lib/format-date"
import { BarList } from "@/components/metrics/bar-list"
import { LifeStatusList } from "@/components/metrics/life-status-list"
import { MonthlyChangesChart } from "@/components/metrics/monthly-changes-chart"

const LIFE_ROWS_SHOWN = 10

function KpiTile({
  label,
  value,
  detail,
  icon: Icon,
  href,
}: {
  label: string
  value: number
  detail: React.ReactNode
  icon: LucideIcon
  href?: string
}) {
  const body = (
    <Card className="h-full transition-colors hover:border-primary/40">
      <CardContent className="space-y-1 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
        <p className="text-3xl font-bold text-foreground">{formatNumber(value)}</p>
        <div className="text-xs text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

export default async function MetricsPage() {
  const supabase = await createClient()

  const [printersResult, changesResult, tasksResult] = await Promise.all([
    supabase.from("printers").select("id, name, counter, updated_at"),
    supabase
      .from("spare_part_changes")
      .select(`
        change_date,
        quantity,
        printer_id,
        printer_counter,
        spare_parts (
          id,
          code,
          description,
          high_rotation,
          useful_life,
          category_id,
          spare_part_categories ( name )
        )
      `)
      .order("change_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("tasks").select("due_date, completed_at, completed_by"),
  ])

  const metrics = buildMetrics({
    printers: printersResult.data ?? [],
    // Sin tipos generados, supabase-js tipa las relaciones como arrays; en
    // runtime spare_parts (muchos-a-uno) llega como objeto.
    changes: (changesResult.data ?? []) as unknown as ChangeInput[],
    tasks: tasksResult.data ?? [],
  })

  const urgent = metrics.life.filter((row) => row.status === "critical" || row.status === "serious")
  const critical = urgent.filter((row) => row.status === "critical").length
  const stale = metrics.staleCounters
  const totalLast12 = metrics.monthly.reduce((sum, point) => sum + point.quantity, 0)

  return (
    <div className="viz-root space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Métricas</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Consumo de repuestos, vida útil y seguimiento del trabajo
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Repuestos cambiados"
          value={metrics.partsLast30}
          icon={Package}
          detail={
            <>
              Últimos 30 días · los 30 anteriores:{" "}
              <span className="font-medium text-foreground">{formatNumber(metrics.partsPrev30)}</span>
            </>
          }
        />
        <KpiTile
          label="Por cambiar pronto"
          value={urgent.length}
          icon={Gauge}
          detail={
            critical > 0 ? (
              <span className="flex items-center gap-1">
                <AlertOctagon className="h-3.5 w-3.5" style={{ color: "var(--status-critical)" }} aria-hidden />
                <span className="font-medium text-foreground">{critical}</span> para cambiar ya
              </span>
            ) : (
              "Vida útil restante ≤ 25%"
            )
          }
        />
        <KpiTile
          label="Contadores sin actualizar"
          value={stale.length}
          icon={CalendarClock}
          href="/dashboard/update-counters"
          detail={
            stale.length > 0 ? (
              <span className="line-clamp-2">
                Hace más de {STALE_COUNTER_DAYS} días: {stale.slice(0, 3).map((p) => p.name).join(", ")}
                {stale.length > 3 && ` y ${stale.length - 3} más`}
              </span>
            ) : (
              `Todos al día (últimos ${STALE_COUNTER_DAYS} días)`
            )
          }
        />
        <KpiTile
          label="Tareas vencidas"
          value={metrics.overdueTasks}
          icon={ClipboardX}
          href="/dashboard/tasks"
          detail="Sin completar, con fecha pasada"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repuestos cambiados por mes</CardTitle>
          <CardDescription>
            Unidades en los últimos 12 meses · total {formatNumber(totalLast12)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MonthlyChangesChart data={metrics.monthly} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vida útil: lo más próximo a cambiar</CardTitle>
          <CardDescription>
            Vida restante del último repuesto puesto en cada categoría, según el contador actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LifeStatusList rows={metrics.life.slice(0, LIFE_ROWS_SHOWN)} />
          {metrics.life.length > LIFE_ROWS_SHOWN && (
            <p className="mt-2 px-2 text-xs text-muted-foreground">
              Mostrando {LIFE_ROWS_SHOWN} de {metrics.life.length}. El resto tiene más vida útil restante.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Repuestos más usados</CardTitle>
            <CardDescription>Unidades en los últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList items={metrics.topParts} emptyText="Sin cambios en los últimos 12 meses" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Impresoras con más repuestos</CardTitle>
            <CardDescription>Unidades en los últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList
              items={metrics.topPrinters}
              emptyText="Sin cambios en los últimos 12 meses"
              hrefFor={(item) => `/dashboard/printers/${item.id}`}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tareas completadas por técnico</CardTitle>
          <CardDescription>Últimos {TASKS_WINDOW_DAYS} días</CardDescription>
        </CardHeader>
        <CardContent>
          <BarList items={metrics.tasksByTech} emptyText="Sin tareas completadas" />
        </CardContent>
      </Card>
    </div>
  )
}
