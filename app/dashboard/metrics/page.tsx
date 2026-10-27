import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { buildLifeMetrics, type ChangeInput } from "@/lib/metrics"
import { LifeStatusList } from "@/components/metrics/life-status-list"
import { PartLifeTable } from "@/components/metrics/part-life-table"

const OVERDUE_ROWS_SHOWN = 10
const UPCOMING_ROWS_SHOWN = 10
const READINGS_LOOKBACK_DAYS = 365

export default async function MetricsPage() {
  const supabase = await createClient()
  const readingsSince = new Date(Date.now() - READINGS_LOOKBACK_DAYS * 86_400_000).toISOString()

  const [printersResult, changesResult, readingsResult] = await Promise.all([
    supabase.from("printers").select("id, name, counter, updated_at"),
    supabase
      .from("spare_part_changes")
      .select(`
        change_date,
        printer_id,
        printer_counter,
        spare_parts (
          id,
          code,
          description,
          useful_life,
          category_id,
          spare_part_categories ( name )
        )
      `)
      .order("change_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("counter_readings")
      .select("printer_id, counter, read_at")
      .gte("read_at", readingsSince),
  ])

  const { overdue, upcoming, partStats } = buildLifeMetrics({
    printers: printersResult.data ?? [],
    // Sin tipos generados, supabase-js tipa las relaciones como arrays; en
    // runtime spare_parts (muchos-a-uno) llega como objeto.
    changes: (changesResult.data ?? []) as unknown as ChangeInput[],
    // Si la migración 013 todavía no se aplicó, la consulta falla y se sigue
    // con las lecturas que salen de los cambios de repuestos.
    readings: readingsResult.data ?? [],
  })

  return (
    <div className="viz-root space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Métricas</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Vida útil de los repuestos en toda la flota
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vida útil: lo más próximo a cambiar</CardTitle>
          <CardDescription>
            Vida restante del último repuesto puesto en cada categoría, según el contador actual. La
            fecha estimada sale del ritmo de copias de cada máquina.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <section>
            <h3 className="px-2 text-sm font-semibold text-foreground">
              Próximos cambios <span className="font-normal text-muted-foreground">· por fecha estimada</span>
            </h3>
            <LifeStatusList rows={upcoming.slice(0, UPCOMING_ROWS_SHOWN)} />
            {upcoming.length > UPCOMING_ROWS_SHOWN && (
              <p className="mt-1 px-2 text-xs text-muted-foreground">
                Mostrando {UPCOMING_ROWS_SHOWN} de {upcoming.length}. El resto se vence más adelante.
              </p>
            )}
          </section>

          {overdue.length > 0 && (
            <section className="mt-6 border-t pt-4">
              <h3 className="px-2 text-sm font-semibold text-foreground">
                Vencidas ({overdue.length}){" "}
                <span className="font-normal text-muted-foreground">· las más excedidas primero</span>
              </h3>
              <LifeStatusList rows={overdue.slice(0, OVERDUE_ROWS_SHOWN)} />
              {overdue.length > OVERDUE_ROWS_SHOWN && (
                <p className="mt-1 px-2 text-xs text-muted-foreground">
                  Mostrando {OVERDUE_ROWS_SHOWN} de {overdue.length}.
                </p>
              )}
            </section>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vida útil real de los repuestos</CardTitle>
          <CardDescription>
            Cuántas copias duró cada repuesto hasta que se cambió por otro de su misma categoría en
            la misma máquina, comparado con la vida útil estimada. Solo incluye repuestos con
            categoría. Si un cambio no se registró, ese intervalo cuenta doble y sube el promedio:
            la mediana es menos sensible a eso.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PartLifeTable stats={partStats} />
        </CardContent>
      </Card>
    </div>
  )
}
