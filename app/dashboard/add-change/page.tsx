"use client"

import React from "react"
import { useState, useEffect, useMemo, useRef } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Loader2, History, Printer, Package, Check, Search } from "lucide-react"
import { formatDate } from "@/lib/format-date"

interface PrinterOption {
  id: string
  name: string
  counter: number
  color: string
}

interface SparePartOption {
  id: string
  code: string
  description: string
  high_rotation: boolean
}

export default function AddChangePage() {
  const searchParams = useSearchParams()
  const initialPrinterId = searchParams.get("printer") || ""
  
  const [printers, setPrinters] = useState<PrinterOption[]>([])
  const [spareParts, setSpareParts] = useState<SparePartOption[]>([])
  const [selectedPrinter, setSelectedPrinter] = useState(initialPrinterId)
  const [selectedSparePart, setSelectedSparePart] = useState<SparePartOption | null>(null)
  const [sparePartSearch, setSparePartSearch] = useState("")
  const [showSparePartDropdown, setShowSparePartDropdown] = useState(false)
  const [changeDate, setChangeDate] = useState(new Date().toISOString().split("T")[0])
  const [printerCounter, setPrinterCounter] = useState("")
  const [quantity, setQuantity] = useState("1")
  const [detail, setDetail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const supabase = createClient()
  const sparePartInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadData() {
      const [printersRes, sparePartsRes] = await Promise.all([
        supabase.from("printers").select("id, name, counter, color").order("name"),
        supabase.from("spare_parts").select("id, code, description, high_rotation").order("high_rotation", { ascending: false }).order("code"),
      ])

      if (printersRes.data) setPrinters(printersRes.data)
      if (sparePartsRes.data) setSpareParts(sparePartsRes.data)
      setLoadingData(false)
    }
    loadData()
  }, [supabase])

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSparePartDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Auto-fill counter when printer is selected
  useEffect(() => {
    if (selectedPrinter) {
      const printer = printers.find((p) => p.id === selectedPrinter)
      if (printer) {
        setPrinterCounter(printer.counter?.toString() ?? "0")
      }
    }
  }, [selectedPrinter, printers])

  // Filter spare parts based on search
  const filteredSpareParts = useMemo(() => {
    if (!sparePartSearch.trim()) return spareParts
    const search = sparePartSearch.toLowerCase()
    return spareParts.filter(
      (part) =>
        part.code.toLowerCase().includes(search) ||
        part.description.toLowerCase().includes(search)
    )
  }, [spareParts, sparePartSearch])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    if (!selectedPrinter || !selectedSparePart) {
      setError("Selecciona una impresora y un repuesto")
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Debes iniciar sesión")
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase.from("spare_part_changes").insert({
      user_id: user.id,
      printer_id: selectedPrinter,
      spare_part_id: selectedSparePart.id,
      change_date: changeDate,
      printer_counter: Number(printerCounter) || 0,
      quantity: Number(quantity) || 1,
      detail: detail || null,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // Mostrar mensaje de éxito y limpiar solo los campos del repuesto
    const printerName = selectedPrinterData?.name || "la impresora"
    setSuccess(`Cambio de "${selectedSparePart.code}" agregado a ${printerName}`)
    
    // Limpiar campos para agregar otro cambio (mantener impresora, fecha y contador)
    setSelectedSparePart(null)
    setSparePartSearch("")
    setQuantity("1")
    setDetail("")
    
    setLoading(false)
    
    // Ocultar mensaje de éxito después de 4 segundos
    setTimeout(() => setSuccess(null), 4000)
  }

  function selectSparePart(part: SparePartOption) {
    setSelectedSparePart(part)
    setSparePartSearch(`${part.code} - ${part.description}`)
    setShowSparePartDropdown(false)
  }

  const selectedPrinterData = printers.find((p) => p.id === selectedPrinter)

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Agregar Cambio</h1>
          <p className="text-muted-foreground mt-1">
            Registra un cambio de repuesto en una impresora
          </p>
        </div>
      </div>

      {printers.length === 0 || spareParts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">Faltan datos necesarios</h3>
            <p className="text-muted-foreground mb-4">
              {printers.length === 0 && spareParts.length === 0
                ? "Necesitas registrar al menos una impresora y un repuesto"
                : printers.length === 0
                  ? "Necesitas registrar al menos una impresora"
                  : "Necesitas registrar al menos un repuesto"}
            </p>
            <div className="flex gap-3 justify-center">
              {printers.length === 0 && (
                <Button asChild>
                  <Link href="/dashboard/printers/new">
                    <Printer className="mr-2 h-4 w-4" />
                    Agregar Impresora
                  </Link>
                </Button>
              )}
              {spareParts.length === 0 && (
                <Button asChild variant={printers.length === 0 ? "outline" : "default"}>
                  <Link href="/dashboard/spare-parts/new">
                    <Package className="mr-2 h-4 w-4" />
                    Agregar Repuesto
                  </Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-chart-3" />
              Datos del Cambio
            </CardTitle>
            <CardDescription>
              Completa los datos del cambio de repuesto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 text-sm text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-md flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  {success}
                </div>
              )}

              <div className="space-y-2">
                <Label>Impresora</Label>
                <Select value={selectedPrinter} onValueChange={setSelectedPrinter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una impresora" />
                  </SelectTrigger>
                  <SelectContent>
                    {printers.map((printer) => (
                      <SelectItem key={printer.id} value={printer.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: printer.color || "#3b82f6" }}
                          />
                          <span>{printer.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedPrinterData && (
                  <p className="text-xs text-muted-foreground">
                    Contador actual: {selectedPrinterData.counter?.toLocaleString("es-AR")} copias
                  </p>
                )}
              </div>

              <div className="space-y-2 relative" ref={dropdownRef}>
                <Label>Repuesto (buscar por código o nombre)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={sparePartInputRef}
                    type="text"
                    placeholder="Escribe para buscar repuestos..."
                    value={sparePartSearch}
                    onChange={(e) => {
                      setSparePartSearch(e.target.value)
                      setShowSparePartDropdown(true)
                      if (!e.target.value.trim()) {
                        setSelectedSparePart(null)
                      }
                    }}
                    onFocus={() => setShowSparePartDropdown(true)}
                    className="pl-10"
                  />
                </div>
                {showSparePartDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredSpareParts.length > 0 ? (
                      filteredSpareParts.map((part) => (
                        <button
                          key={part.id}
                          type="button"
                          onClick={() => selectSparePart(part)}
                          className={`w-full px-3 py-2 text-left hover:bg-muted/50 flex items-center gap-2 ${
                            selectedSparePart?.id === part.id ? "bg-muted" : ""
                          }`}
                        >
                          <span className="font-mono text-sm font-medium">{part.code}</span>
                          <span className="text-muted-foreground">-</span>
                          <span className="flex-1 truncate">{part.description}</span>
                          {part.high_rotation && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">
                              <Check className="mr-1 h-3 w-3" />
                              Alta Rotación
                            </Badge>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                        No se encontraron repuestos
                      </div>
                    )}
                  </div>
                )}
                {selectedSparePart && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3 w-3 text-accent" />
                    Seleccionado: {selectedSparePart.code}
                    {selectedSparePart.high_rotation && " (Alta Rotación)"}
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="changeDate">Fecha de Cambio</Label>
                  <Input
                    id="changeDate"
                    type="date"
                    value={changeDate}
                    onChange={(e) => setChangeDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="printerCounter">Contador Impresora</Label>
                  <Input
                    id="printerCounter"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={printerCounter}
                    onChange={(e) => setPrinterCounter(e.target.value.replace(/[^0-9]/g, ""))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="detail">Detalle / Observaciones (opcional)</Label>
                <Textarea
                  id="detail"
                  placeholder="Agrega comentarios o aclaraciones sobre este cambio..."
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  rows={3}
                />
              </div>

              {selectedPrinterData && selectedSparePart && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Resumen del cambio:</p>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <span className="font-medium text-foreground">Impresora:</span>{" "}
                      {selectedPrinterData.name}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Repuesto:</span>{" "}
                      {selectedSparePart.code} - {selectedSparePart.description}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Cantidad:</span>{" "}
                      {quantity} unidad{Number(quantity) > 1 ? "es" : ""}
                    </p>
                    <p>
                      <span className="font-medium text-foreground">Fecha:</span>{" "}
                      {formatDate(changeDate)}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" asChild className="flex-1 bg-transparent">
                  <Link href="/dashboard">Cancelar</Link>
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={loading || !selectedPrinter || !selectedSparePart}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar Cambio"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
