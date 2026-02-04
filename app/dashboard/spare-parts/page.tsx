import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Package, Check } from "lucide-react"
import { SparePartActions } from "@/components/spare-parts/spare-part-actions"

export default async function SparePartsPage() {
  const supabase = await createClient()

  const { data: spareParts } = await supabase
    .from("spare_parts")
    .select("*")
    .order("high_rotation", { ascending: false })
    .order("code", { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Repuestos</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona el catálogo de repuestos disponibles
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/spare-parts/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Repuesto
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            Catálogo de Repuestos
          </CardTitle>
          <CardDescription>
            Lista de todos los repuestos registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {spareParts && spareParts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">Alta Rotación</TableHead>
                    <TableHead className="text-right">Fecha Registro</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spareParts.map((part) => (
                    <TableRow key={part.id}>
                      <TableCell className="font-mono font-medium">
                        {part.code}
                      </TableCell>
                      <TableCell>{part.description}</TableCell>
                      <TableCell className="text-center">
                        {part.high_rotation ? (
                          <Badge className="bg-accent text-accent-foreground">
                            <Check className="mr-1 h-3 w-3" />
                            Alta Rotación
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {new Date(part.created_at).toLocaleDateString("es-AR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <SparePartActions sparePart={part} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay repuestos registrados</p>
              <p className="text-sm mt-1 mb-4">
                Comienza agregando tu primer repuesto al catálogo
              </p>
              <Button asChild>
                <Link href="/dashboard/spare-parts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Repuesto
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
