"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Hash, Calendar, History, Plus, Settings, HeartPulse } from "lucide-react"
import { UpdateCounterForm } from "@/components/printers/update-counter-form"
import { EditPrinterNameForm } from "@/components/printers/edit-printer-name-form"
import { EditPrinterSerialForm } from "@/components/printers/edit-printer-serial-form"
import { EditPrinterColorForm } from "@/components/printers/edit-printer-color-form"
import { DeletePrinterButton } from "@/components/printers/delete-printer-button"
import { formatDate, formatNumber } from "@/lib/format-date"

type TabType = "counter" | "info" | "history" | "life"

interface PrinterData {
  id: string
  name: string
  counter: number | null
  color: string | null
  serial_number: string | null
  created_at: string
  updated_at: string
}

interface ChangeData {
  id: string
  change_date: string
  printer_counter: number | null
  quantity: number
  spare_parts: {
    code: string
    description: string
    high_rotation: boolean
  } | null
}

interface CategoryLifeData {
  categoryId: string
  categoryName: string
  sparePartCode: string
  sparePartDescription: string
  usefulLife: string
  printerCounterAtChange: number
  changeDate: string
}

interface Props {
  printer: PrinterData
  recentChanges: ChangeData[] | null
  categoryLifeData: CategoryLifeData[]
}

// Parse useful_life string to get numeric value (assumes it's in copies)
function parseUsefulLife(usefulLife: string): number | null {
  // Remove dots/commas as thousand separators and extract number
  const cleaned = usefulLife.replace(/\./g, "").replace(/,/g, "")
  const match = cleaned.match(/(\d+)/)
  if (match) {
    return parseInt(match[1], 10)
  }
  return null
}

function calculateLifePercentage(
  currentCounter: number,
  counterAtChange: number,
  usefulLife: string
): { percentage: number; copiesUsed: number; totalLife: number | null } {
  const totalLife = parseUsefulLife(usefulLife)
  const copiesUsed = currentCounter - counterAtChange
  
  if (totalLife === null || totalLife === 0) {
    return { percentage: 0, copiesUsed, totalLife: null }
  }
  
  const remaining = totalLife - copiesUsed
  const percentage = Math.max(0, Math.min(100, (remaining / totalLife) * 100))
  
  return { percentage, copiesUsed, totalLife }
}

function getProgressColor(percentage: number): string {
  if (percentage > 50) return "bg-green-500"
  if (percentage > 25) return "bg-yellow-500"
  if (percentage > 10) return "bg-orange-500"
  return "bg-red-500"
}

export function PrinterDetailTabs({ printer, recentChanges, categoryLifeData }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("counter")

  const tabs = [
    { id: "counter" as TabType, label: "Contador", icon: Hash },
    { id: "life" as TabType, label: "Vida útil", icon: HeartPulse },
    { id: "info" as TabType, label: "Info", icon: Settings },
    { id: "history" as TabType, label: "Historial", icon: History },
  ]

  return (
    <div className="space-y-4">
      {/* Tab Navigation - Fixed at top for mobile */}
      <div className="sticky top-0 z-10 bg-background pb-2">
        <div className="flex gap-1 p-1.5 bg-muted rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-xs">{tab.id === "counter" ? "Cont." : tab.id === "life" ? "Vida" : tab.id === "info" ? "Info" : "Hist."}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "counter" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Hash className="h-5 w-5 text-primary" />
              Contador Actual
            </CardTitle>
            <CardDescription>
              Actualiza el contador de copias de la impresora
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl sm:text-5xl font-bold text-primary text-center py-4">
              {formatNumber(printer.counter ?? 0)}
              <span className="text-base sm:text-lg font-normal text-muted-foreground ml-2">copias</span>
            </div>
            <UpdateCounterForm printerId={printer.id} currentCounter={printer.counter ?? 0} />
          </CardContent>
        </Card>
      )}

      {activeTab === "info" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-accent" />
              Información de la Impresora
            </CardTitle>
            <CardDescription>
              Edita los datos de la impresora
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <EditPrinterNameForm printerId={printer.id} currentName={printer.name} />
            <EditPrinterSerialForm printerId={printer.id} currentSerialNumber={printer.serial_number} />
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Fecha de registro</span>
              <span className="text-sm font-medium">{formatDate(printer.created_at)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Última actualización</span>
              <span className="text-sm font-medium">{formatDate(printer.updated_at)}</span>
            </div>
            <EditPrinterColorForm printerId={printer.id} currentColor={printer.color || "#3b82f6"} />
            <div className="pt-4 mt-4 border-t border-destructive/20">
              <p className="text-xs text-muted-foreground mb-2">Zona de peligro</p>
              <DeletePrinterButton printerId={printer.id} printerName={printer.name} />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="h-5 w-5 text-chart-3" />
                Historial de Repuestos
              </CardTitle>
              <CardDescription>
                Últimos cambios en esta impresora
              </CardDescription>
              <div className="flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/dashboard/add-change?printer=${printer.id}`}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/dashboard/printers/${printer.id}/history`}>
                    Ver todo
                  </Link>
                </Button>
              </div>
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
                      className="p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs bg-background px-1.5 py-0.5 rounded">
                            {change.spare_parts?.code}
                          </span>
                          {change.spare_parts?.high_rotation && (
                            <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded">
                              Alta rotación
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(change.change_date)}</span>
                      </div>
                      <p className="font-medium text-sm mb-2">{change.spare_parts?.description}</p>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Cantidad: <span className="font-medium text-foreground">{change.quantity}x</span></span>
                        <span>Diferencia: <span className="font-medium text-foreground">+{formatNumber(diferencia)}</span></span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-3">No hay cambios registrados</p>
                <Button asChild size="sm">
                  <Link href={`/dashboard/add-change?printer=${printer.id}`}>
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar cambio
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "life" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <HeartPulse className="h-5 w-5 text-green-500" />
              Vida Útil por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {categoryLifeData.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {categoryLifeData.map((item) => {
                  const { percentage, copiesUsed } = calculateLifePercentage(
                    printer.counter ?? 0,
                    item.printerCounterAtChange,
                    item.usefulLife
                  )
                  const progressColor = getProgressColor(percentage)
                  
                  return (
                    <div key={item.categoryId} className="p-3 bg-muted/50 rounded-lg space-y-2 overflow-hidden">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-sm truncate flex-1 min-w-0">{item.categoryName}</h3>
                        <span className={`text-base font-bold shrink-0 ${percentage > 25 ? "text-foreground" : "text-red-500"}`}>
                          {Math.round(percentage)}%
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-full ${progressColor}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <p className="text-xs text-muted-foreground break-words">{item.sparePartDescription}</p>
                        <span className="text-xs font-medium">{formatNumber(copiesUsed)} copias</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <HeartPulse className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm mb-2">No hay datos de vida útil disponibles</p>
                <p className="text-xs">
                  Para ver la vida útil, asigna una categoría y vida útil a tus repuestos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
