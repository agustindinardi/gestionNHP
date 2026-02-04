"use client"

import React from "react"
import { useState, useEffect, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, History, Printer, Plus, ArrowUpDown, Filter, Loader2, TrendingUp, Trash2, X } from "lucide-react"
import { formatDate, formatNumber } from "@/lib/format-date"

interface PrinterData {
  id: string
  name: string
  counter: number
  color: string
}

interface ChangeData {
  id: string
  change_date: string
  printer_counter: number
  quantity: number
  detail: string | null
  spare_parts: {
    code: string
    description: string
    high_rotation: boolean
  } | null
}

export default function PrinterHistoryPage() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClient()

  const [printer, setPrinter] = useState<PrinterData | null>(null)
  const [changes, setChanges] = useState<ChangeData[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc")
  const [filterHighRotation, setFilterHighRotation] = useState<"all" | "high" | "normal">("all")
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function loadData() {
      const [printerRes, changesRes] = await Promise.all([
        supabase.from("printers").select("*").eq("id", id).single(),
        supabase
          .from("spare_part_changes")
          .select(`*, spare_parts (code, description, high_rotation)`)
          .eq("printer_id", id)
          .order("change_date", { ascending: false }),
      ])

      if (printerRes.data) setPrinter(printerRes.data)
      if (changesRes.data) setChanges(changesRes.data)
      setLoading(false)
    }
    loadData()
  }, [id, supabase])

  const processedChanges = useMemo(() => {
    let result = [...changes]

    if (filterHighRotation === "high") {
      result = result.filter((c) => c.spare_parts?.high_rotation)
    } else if (filterHighRotation === "normal") {
      result = result.filter((c) => !c.spare_parts?.high_rotation)
    }

    // Ordenar solo por fecha
    result.sort((a, b) => {
      const dateA = new Date(a.change_date).getTime()
      const dateB = new Date(b.change_date).getTime()
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB
    })

    return result
  }, [changes, sortOrder, filterHighRotation])

  function calculateDifference(changeCounter: number): number {
    if (!printer) return 0
    return printer.counter - changeCounter
  }

  function toggleSelection(changeId: string) {
    const newSelected = new Set(selectedChanges)
    if (newSelected.has(changeId)) {
      newSelected.delete(changeId)
    } else {
      newSelected.add(changeId)
    }
    setSelectedChanges(newSelected)
  }

  function toggleSelectAll() {
    if (selectedChanges.size === processedChanges.length) {
      setSelectedChanges(new Set())
    } else {
      setSelectedChanges(new Set(processedChanges.map((c) => c.id)))
    }
  }

  function cancelSelectionMode() {
    setIsSelectionMode(false)
    setSelectedChanges(new Set())
  }

  async function handleDeleteSelected() {
    if (selectedChanges.size === 0) return
    
    setDeleting(true)
    
    const { error } = await supabase
      .from("spare_part_changes")
      .delete()
      .in("id", Array.from(selectedChanges))
    
    if (!error) {
      setChanges(changes.filter((c) => !selectedChanges.has(c.id)))
      setSelectedChanges(new Set())
      setIsSelectionMode(false)
    }
    
    setDeleting(false)
    setShowDeleteDialog(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!printer) {
    return (
      <div className="text-center py-12">
        <p>Impresora no encontrada</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/printers">Volver</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href={`/dashboard/printers/${id}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded-md shrink-0"
              style={{ backgroundColor: printer.color || "#3b82f6" }}
            >
              <Printer className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
              {printer.name}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Contador: {formatNumber(printer.counter ?? 0)} copias
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0">
          <Link href={`/dashboard/add-change?printer=${id}`}>
            <Plus className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Agregar</span>
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as "desc" | "asc")}>
          <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none h-9 text-sm">
            <ArrowUpDown className="mr-1 h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">Más reciente</SelectItem>
            <SelectItem value="asc">Más antiguo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterHighRotation} onValueChange={(v) => setFilterHighRotation(v as "all" | "high" | "normal")}>
          <SelectTrigger className="flex-1 sm:w-[140px] sm:flex-none h-9 text-sm">
            <Filter className="mr-1 h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="high">Alta Rotación</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
          </SelectContent>
        </Select>
        
        {!isSelectionMode ? (
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            onClick={() => setIsSelectionMode(true)}
            disabled={processedChanges.length === 0}
          >
            <Trash2 className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Eliminar</span>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9"
              onClick={toggleSelectAll}
            >
              {selectedChanges.size === processedChanges.length ? "Deseleccionar" : "Seleccionar todos"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="h-9"
              onClick={() => setShowDeleteDialog(true)}
              disabled={selectedChanges.size === 0}
            >
              <Trash2 className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Eliminar</span>
              {selectedChanges.size > 0 && ` (${selectedChanges.size})`}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={cancelSelectionMode}
            >
              <X className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Cancelar</span>
            </Button>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {processedChanges.length} cambios encontrados
      </p>

      {/* Changes list - Mobile optimized cards */}
      {processedChanges.length > 0 ? (
        <div className="space-y-2">
          {processedChanges.map((change) => {
            const difference = calculateDifference(change.printer_counter)
            const isSelected = selectedChanges.has(change.id)
            return (
              <Card 
                key={change.id} 
                className={`overflow-hidden transition-colors ${isSelectionMode ? "cursor-pointer" : ""} ${isSelected ? "ring-2 ring-primary bg-primary/5" : ""}`}
                onClick={isSelectionMode ? () => toggleSelection(change.id) : undefined}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isSelectionMode && (
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(change.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <Badge variant="outline" className="font-mono text-xs">
                        {change.spare_parts?.code}
                      </Badge>
                      {change.spare_parts?.high_rotation && (
                        <Badge className="text-xs bg-accent text-accent-foreground">
                          Alta Rotación
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(change.change_date)}
                    </span>
                  </div>
                  
                  <p className="font-medium text-sm mb-2">{change.spare_parts?.description}</p>
                  
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-muted-foreground">Cantidad</p>
                      <p className="font-bold text-base">{change.quantity}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2 text-center">
                      <p className="text-muted-foreground">Contador</p>
                      <p className="font-mono font-medium">{formatNumber(change.printer_counter)}</p>
                    </div>
                    <div className="bg-primary/10 rounded p-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>Diferencia</span>
                      </div>
                      <p className="font-mono font-bold text-primary text-base sm:text-lg">+{formatNumber(difference)}</p>
                    </div>
                  </div>
                  
                  {change.detail && (
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                      {change.detail}
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay cambios registrados</p>
            <Button asChild size="sm" className="mt-3">
              <Link href={`/dashboard/add-change?printer=${id}`}>
                <Plus className="mr-1 h-4 w-4" />
                Agregar cambio
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cambios seleccionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar {selectedChanges.size} cambio{selectedChanges.size > 1 ? "s" : ""} de repuesto.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
