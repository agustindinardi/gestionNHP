import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Printer } from "lucide-react"
import { PrinterCard } from "@/components/printers/printer-card"
import { PrintersScrollRestorer } from "@/components/printers/scroll-restorer"

export default async function PrintersPage() {
  const supabase = await createClient()
  
  const { data: printers } = await supabase
    .from("printers")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div className="space-y-6">
      <PrintersScrollRestorer />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Impresoras</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona tus impresoras y sus contadores
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/printers/new">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Impresora
          </Link>
        </Button>
      </div>

      {printers && printers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {printers.map((printer) => (
            <PrinterCard key={printer.id} printer={printer} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Printer className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No hay impresoras registradas</h3>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Comienza agregando tu primera impresora
            </p>
            <Button asChild>
              <Link href="/dashboard/printers/new">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Impresora
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
