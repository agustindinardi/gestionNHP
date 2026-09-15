import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, Package, History, TrendingUp, ClipboardList, RefreshCw, BookOpen } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/format-date"
import { getArgentinaTodayYmd } from "@/lib/argentina-time"

export default async function DashboardPage() {
  // El middleware ya redirige a /auth/login si no hay usuario, así que no
  // repetimos supabase.auth.getUser() (round-trip de red). RLS filtra por user_id.
  const supabase = await createClient()

  // head: true => Postgres devuelve solo el count, sin transferir filas.
  // Antes select("*") traía TODAS las filas (incl. el historial completo de
  // spare_part_changes) solo para descartarlas y quedarse con .count.
  const [printersResult, sparePartsResult, changesResult, tasksResult] = await Promise.all([
    supabase.from("printers").select("id", { count: "exact", head: true }),
    supabase.from("spare_parts").select("id", { count: "exact", head: true }),
    supabase.from("spare_part_changes").select("id", { count: "exact", head: true }),
    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("due_date", getArgentinaTodayYmd())
      .is("completed_at", null),
  ])

  const printerCount = printersResult.count ?? 0
  const sparePartsCount = sparePartsResult.count ?? 0
  const changesCount = changesResult.count ?? 0
  const tasksCount = tasksResult.count ?? 0

  // Get recent changes
  const { data: recentChanges } = await supabase
    .from("spare_part_changes")
    .select(`
      *,
      printers (name),
      spare_parts (code, description)
    `)
    .order("change_date", { ascending: false })
    .limit(15)

  const sections = [
    {
      title: "Impresoras",
      subtitle: `${printerCount} registradas`,
      icon: Printer,
      href: "/dashboard/printers",
      color: "bg-primary",
    },
    {
      title: "Repuestos",
      subtitle: `${sparePartsCount} en stock`,
      icon: Package,
      href: "/dashboard/spare-parts",
      color: "bg-accent",
    },
    {
      title: "Agregar Cambio",
      subtitle: `${changesCount} en historial`,
      icon: History,
      href: "/dashboard/add-change",
      color: "bg-chart-3",
    },
    {
      title: "Actualizar contadores",
      subtitle: "Cargar valores",
      icon: RefreshCw,
      href: "/dashboard/update-counters",
      color: "bg-cyan-600",
    },
    {
      title: "Manuales",
      subtitle: "Códigos y errores",
      icon: BookOpen,
      href: "/dashboard/manuals",
      color: "bg-purple-600",
    },
    {
      title: "Tareas",
      subtitle: `${tasksCount} para hoy`,
      icon: ClipboardList,
      href: "/dashboard/tasks",
      color: "bg-blue-500",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Elegí un apartado
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {sections.map((section) => (
          <Link key={section.title} href={section.href}>
            <Card className="h-full hover:shadow-md hover:border-primary/40 active:scale-[0.97] transition-all cursor-pointer">
              <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center min-h-[120px]">
                <div className={`p-3 rounded-2xl ${section.color}`}>
                  <section.icon className="h-6 w-6 text-white" />
                </div>
                <span className="font-semibold text-sm leading-tight">{section.title}</span>
                <span className="text-xs text-muted-foreground">{section.subtitle}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Cambios Recientes
          </CardTitle>
          <CardDescription>
            Últimos cambios de repuestos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentChanges && recentChanges.length > 0 ? (
            <div className="space-y-4">
              {recentChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">
                      {change.printers?.name ?? "Impresora"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {change.spare_parts?.code} - {change.spare_parts?.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {change.quantity} unidad{change.quantity > 1 ? "es" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(change.change_date)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay cambios registrados aún</p>
              <p className="text-sm mt-1">
                Comienza agregando impresoras y repuestos
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
