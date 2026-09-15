import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Printer } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { PrinterDetailTabs } from "@/components/printers/printer-detail-tabs"

interface Props {
  params: Promise<{ id: string }>
}

export default async function PrinterDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Antes había 3 queries en serie: printer -> recentChanges(limit 5) ->
  // allChangesWithCategory. Las dos de spare_part_changes pegaban a la misma
  // tabla/filtro y recentChanges era un subconjunto de la otra. Ahora:
  //   1) una sola query de cambios (superset de columnas) reemplaza a las dos.
  //   2) corre en paralelo con la de printer (Promise.all), sin waterfall.
  const [printerResult, changesResult] = await Promise.all([
    supabase.from("printers").select("*").eq("id", id).single(),
    supabase
      .from("spare_part_changes")
      .select(`
        *,
        spare_parts (
          id,
          code,
          description,
          high_rotation,
          useful_life,
          category_id,
          spare_part_categories (
            id,
            name
          )
        )
      `)
      .eq("printer_id", id)
      .order("change_date", { ascending: false }),
  ])

  const printer = printerResult.data
  if (!printer) {
    notFound()
  }

  const allChangesWithCategory = changesResult.data
  // Los 5 más recientes salen del mismo resultado ya ordenado desc, sin otra query.
  const recentChanges = allChangesWithCategory ? allChangesWithCategory.slice(0, 5) : null

  // Process to get latest change per category with useful_life
  const categoryLifeMap = new Map<string, {
    categoryId: string
    categoryName: string
    sparePartCode: string
    sparePartDescription: string
    usefulLife: string
    printerCounterAtChange: number
    changeDate: string
  }>()

  if (allChangesWithCategory) {
    for (const change of allChangesWithCategory) {
      const sparePart = change.spare_parts
      if (sparePart?.category_id && sparePart?.useful_life && sparePart?.spare_part_categories) {
        const categoryId = sparePart.category_id
        // Only keep the first (most recent) change per category
        if (!categoryLifeMap.has(categoryId)) {
          categoryLifeMap.set(categoryId, {
            categoryId,
            categoryName: sparePart.spare_part_categories.name,
            sparePartCode: sparePart.code,
            sparePartDescription: sparePart.description,
            usefulLife: sparePart.useful_life,
            printerCounterAtChange: change.printer_counter ?? 0,
            changeDate: change.change_date,
          })
        }
      }
    }
  }

  const categoryLifeData = Array.from(categoryLifeMap.values())
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <BackButton href="/dashboard/printers" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg shrink-0"
              style={{ backgroundColor: printer.color || "#3b82f6" }}
            >
              <Printer className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">{printer.name}</h1>
          </div>
        </div>
      </div>

      <PrinterDetailTabs 
        printer={printer} 
        recentChanges={recentChanges} 
        categoryLifeData={categoryLifeData}
      />
    </div>
  )
}
