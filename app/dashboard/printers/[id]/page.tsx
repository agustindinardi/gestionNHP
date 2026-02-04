import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, History, Printer, Hash, Calendar, Plus } from "lucide-react"
import { UpdateCounterForm } from "@/components/printers/update-counter-form"
import { EditPrinterNameForm } from "@/components/printers/edit-printer-name-form"
import { EditPrinterColorForm } from "@/components/printers/edit-printer-color-form"
import { DeletePrinterButton } from "@/components/printers/delete-printer-button"
import { formatDate, formatNumber } from "@/lib/format-date"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PrinterDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: printer } = await supabase
    .from("printers")
    .select("*")
    .eq("id", id)
    .single()

  if (!printer) {
    notFound()
  }

  // Get recent changes for this printer
  const { data: recentChanges } = await supabase
    .from("spare_part_changes")
    .select(`
      *,
      spare_parts (code, description, high_rotation)
    `)
    .eq("printer_id", id)
    .order("change_date", { ascending: false })
    .limit(5)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/dashboard/printers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg shrink-0"
              style={{ backgroundColor: printer.color || "#3b82f6" }}
            >
              <Printer className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-foreground truncate">{printer.name}</h1>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hash className="h-5 w-5 text-primary" />
              Contador Actual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl sm:text-4xl font-bold text-primary">
              {formatNumber(printer.counter ?? 0)}
              <span className="text-base sm:text-lg font-normal text-muted-foreground ml-2">copias</span>
            </div>
            <UpdateCounterForm printerId={printer.id} currentCounter={printer.counter ?? 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-accent" />
              Información
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <EditPrinterNameForm printerId={printer.id} currentName={printer.name} />
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Fecha de registro</span>
              <span className="text-sm font-medium">{formatDate(printer.created_at)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Última actualización</span>
              <span className="text-sm font-medium">{formatDate(printer.updated_at)}</span>
            </div>
            <EditPrinterColorForm printerId={printer.id} currentColor={printer.color || "#3b82f6"} />
            <div className="pt-4 mt-2 border-t border-destructive/20">
              <p className="text-xs text-muted-foreground mb-2">Zona de peligro</p>
              <DeletePrinterButton printerId={printer.id} printerName={printer.name} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-3 pb-3">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-chart-3" />
              Historial de Repuestos
            </CardTitle>
            <CardDescription>
              Últimos cambios en esta impresora
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm">
              <Link href={`/dashboard/add-change?printer=${printer.id}`}>
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/dashboard/printers/${printer.id}/history`}>
                Ver todo
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentChanges && recentChanges.length > 0 ? (
            <div className="space-y-2">
              {recentChanges.map((change) => {
                const diferencia = (printer.counter ?? 0) - (change.printer_counter ?? 0)
                return (
                  <div
                    key={change.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted/50 rounded-lg gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
                          {change.spare_parts?.code}
                        </span>
                        <span className="font-medium text-sm truncate">
                          {change.spare_parts?.description}
                        </span>
                        {change.spare_parts?.high_rotation && (
                          <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                            Alta rotación
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Contador: {formatNumber(change.printer_counter ?? 0)} | 
                        Diferencia: <span className="text-primary font-medium">+{formatNumber(diferencia)}</span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4 text-sm">
                      <span className="font-medium">{change.quantity}x</span>
                      <span className="text-muted-foreground">{formatDate(change.change_date)}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay cambios registrados</p>
              <Button asChild size="sm" className="mt-3">
                <Link href={`/dashboard/add-change?printer=${printer.id}`}>
                  Agregar cambio de repuesto
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
