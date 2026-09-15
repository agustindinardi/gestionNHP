import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardHeader } from "@/components/ui/card"

// Se muestra al instante (streaming) mientras la página de impresoras resuelve
// sus queries. Imita el layout real de page.tsx para minimizar el salto visual.
export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3 space-y-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-6 w-3/4 mt-3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-2/3" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  )
}
