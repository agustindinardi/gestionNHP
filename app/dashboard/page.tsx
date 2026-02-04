import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Printer, Package, History, TrendingUp } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { formatDate } from "@/lib/format-date"

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Verificar autenticación
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    redirect("/auth/login")
  }
  
  const [printersResult, sparePartsResult, changesResult] = await Promise.all([
    supabase.from("printers").select("*", { count: "exact" }),
    supabase.from("spare_parts").select("*", { count: "exact" }),
    supabase.from("spare_part_changes").select("*", { count: "exact" }),
  ])

  const printerCount = printersResult.count ?? 0
  const sparePartsCount = sparePartsResult.count ?? 0
  const changesCount = changesResult.count ?? 0

  // Get recent changes
  const { data: recentChanges } = await supabase
    .from("spare_part_changes")
    .select(`
      *,
      printers (name),
      spare_parts (code, description)
    `)
    .order("change_date", { ascending: false })
    .limit(5)

  const stats = [
    {
      title: "Impresoras",
      value: printerCount,
      description: "Total registradas",
      icon: Printer,
      href: "/dashboard/printers",
      color: "bg-primary",
    },
    {
      title: "Repuestos",
      value: sparePartsCount,
      description: "En inventario",
      icon: Package,
      href: "/dashboard/spare-parts",
      color: "bg-accent",
    },
    {
      title: "Cambios",
      value: changesCount,
      description: "Historial total",
      icon: History,
      href: "/dashboard/add-change",
      color: "bg-chart-3",
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Bienvenido al sistema de gestión de impresoras
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <stat.icon className="h-4 w-4 text-primary-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
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
