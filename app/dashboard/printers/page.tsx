import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Printer, Eye } from "lucide-react"

export default async function PrintersPage() {
  const supabase = await createClient()
  
  const { data: printers } = await supabase
    .from("printers")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div className="space-y-6">
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
            <Card key={printer.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div
                  className="p-2 rounded-lg w-fit"
                  style={{ backgroundColor: printer.color || "#3b82f6" }}
                >
                  <Printer className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="mt-3">{printer.name}</CardTitle>
                <CardDescription>
                  Contador actual: {printer.counter?.toLocaleString("es-AR") ?? 0} copias
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button asChild variant="outline" className="flex-1 bg-transparent">
                    <Link href={`/dashboard/printers/${printer.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Ver detalle
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
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
