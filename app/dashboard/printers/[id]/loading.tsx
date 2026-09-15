import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

// Skeleton del detalle de impresora: header + barra de tabs + tarjeta de contenido.
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="flex items-center gap-3 flex-1">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <Skeleton className="h-7 w-48" />
        </div>
      </div>

      <div className="flex gap-1 p-1.5 bg-muted rounded-lg">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-11 flex-1" />
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3 space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-1/2 mx-auto" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
