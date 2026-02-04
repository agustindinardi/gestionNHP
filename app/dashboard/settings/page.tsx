"use client"

import React from "react"
import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Settings, Download, Loader2, Database, FileJson, CheckCircle, 
  Upload, FileSpreadsheet, Printer, Package, AlertCircle
} from "lucide-react"
import { formatDate } from "@/lib/format-date"

type ImportType = "printers" | "spare_parts"

interface ImportResult {
  success: number
  errors: string[]
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importType, setImportType] = useState<ImportType>("printers")
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  async function handleBackup() {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const [printersRes, sparePartsRes, changesRes] = await Promise.all([
        supabase.from("printers").select("*").order("name"),
        supabase.from("spare_parts").select("*").order("code"),
        supabase.from("spare_part_changes").select(`
          *,
          printers (name),
          spare_parts (code, description)
        `).order("change_date", { ascending: false }),
      ])

      if (printersRes.error) throw printersRes.error
      if (sparePartsRes.error) throw sparePartsRes.error
      if (changesRes.error) throw changesRes.error

      const backupData = {
        exportDate: new Date().toISOString(),
        exportDateFormatted: formatDate(new Date().toISOString()),
        version: "1.0",
        data: {
          printers: printersRes.data || [],
          spareParts: sparePartsRes.data || [],
          sparePartChanges: changesRes.data || [],
        },
        summary: {
          totalPrinters: printersRes.data?.length || 0,
          totalSpareParts: sparePartsRes.data?.length || 0,
          totalChanges: changesRes.data?.length || 0,
        }
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      const dateStr = new Date().toISOString().split("T")[0].replace(/-/g, "")
      link.href = url
      link.download = `printermanager-backup-${dateStr}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar el backup")
    } finally {
      setLoading(false)
    }
  }

  function parseCSV(text: string): string[][] {
    const lines = text.trim().split(/\r?\n/)
    return lines.map(line => {
      const values: string[] = []
      let current = ""
      let inQuotes = false
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if ((char === ',' || char === ';') && !inQuotes) {
          values.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      values.push(current.trim())
      return values
    })
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setImportLoading(true)
    setImportError(null)
    setImportResult(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Debes iniciar sesión")

      const text = await file.text()
      const rows = parseCSV(text)
      
      if (rows.length < 2) {
        throw new Error("El archivo CSV debe tener al menos una fila de encabezados y una de datos")
      }

      const headers = rows[0].map(h => h.toLowerCase().trim())
      const dataRows = rows.slice(1).filter(row => row.some(cell => cell.trim() !== ""))

      let successCount = 0
      const errors: string[] = []

      if (importType === "printers") {
        // Buscar columnas: nombre, contador, color
        const nameIdx = headers.findIndex(h => 
          h.includes("nombre") || h.includes("name") || h.includes("impresora") || h.includes("printer")
        )
        const counterIdx = headers.findIndex(h => 
          h.includes("contador") || h.includes("counter") || h.includes("copias") || h.includes("copies")
        )
        const colorIdx = headers.findIndex(h => 
          h.includes("color")
        )

        if (nameIdx === -1) {
          throw new Error("No se encontró la columna 'nombre' o 'name' en el CSV")
        }

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          const name = row[nameIdx]?.trim()
          
          if (!name) {
            errors.push(`Fila ${i + 2}: nombre vacío, se omite`)
            continue
          }

          const counter = counterIdx >= 0 ? parseInt(row[counterIdx]?.replace(/\D/g, "") || "0", 10) : 0
          const color = colorIdx >= 0 ? row[colorIdx]?.trim() || "#3b82f6" : "#3b82f6"

          const { error: insertError } = await supabase.from("printers").insert({
            user_id: user.id,
            name,
            counter: isNaN(counter) ? 0 : counter,
            color: color.startsWith("#") ? color : "#3b82f6",
          })

          if (insertError) {
            errors.push(`Fila ${i + 2}: ${insertError.message}`)
          } else {
            successCount++
          }
        }
      } else {
        // Buscar columnas: codigo, descripcion, alta_rotacion
        const codeIdx = headers.findIndex(h => 
          h.includes("codigo") || h.includes("code") || h.includes("código")
        )
        const descIdx = headers.findIndex(h => 
          h.includes("descripcion") || h.includes("description") || h.includes("nombre") || h.includes("name") || h.includes("descripción")
        )
        const highRotIdx = headers.findIndex(h => 
          h.includes("rotacion") || h.includes("rotation") || h.includes("alta") || h.includes("high")
        )

        if (codeIdx === -1) {
          throw new Error("No se encontró la columna 'codigo' o 'code' en el CSV")
        }
        if (descIdx === -1) {
          throw new Error("No se encontró la columna 'descripcion' o 'description' en el CSV")
        }

        for (let i = 0; i < dataRows.length; i++) {
          const row = dataRows[i]
          const code = row[codeIdx]?.trim().toUpperCase()
          const description = row[descIdx]?.trim()
          
          if (!code || !description) {
            errors.push(`Fila ${i + 2}: código o descripción vacía, se omite`)
            continue
          }

          let highRotation = false
          if (highRotIdx >= 0) {
            const val = row[highRotIdx]?.toLowerCase().trim()
            highRotation = val === "si" || val === "sí" || val === "yes" || val === "true" || val === "1" || val === "x"
          }

          const { error: insertError } = await supabase.from("spare_parts").insert({
            user_id: user.id,
            code,
            description,
            high_rotation: highRotation,
          })

          if (insertError) {
            if (insertError.code === "23505") {
              errors.push(`Fila ${i + 2}: el código '${code}' ya existe`)
            } else {
              errors.push(`Fila ${i + 2}: ${insertError.message}`)
            }
          } else {
            successCount++
          }
        }
      }

      setImportResult({ success: successCount, errors })
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Error al importar")
    } finally {
      setImportLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  function downloadTemplate(type: ImportType) {
    let content = ""
    let filename = ""
    
    if (type === "printers") {
      content = "nombre,contador,color\nImpresora Oficina 1,50000,#3b82f6\nImpresora Producción,120000,#22c55e"
      filename = "plantilla_impresoras.csv"
    } else {
      content = "codigo,descripcion,alta_rotacion\nTONER-001,Toner Negro Primera Marca,si\nDRUM-001,Drum Original,no\nFUSER-001,Fusor Compatible,si"
      filename = "plantilla_repuestos.csv"
    }
    
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
          <Settings className="h-7 w-7 text-primary" />
          Configuración
        </h1>
        <p className="text-muted-foreground mt-1">
          Administra las opciones del sistema
        </p>
      </div>

      {/* Importar desde CSV */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Importar desde Excel/CSV
          </CardTitle>
          <CardDescription>
            Importa impresoras o repuestos desde un archivo CSV (puedes exportar desde Excel como CSV)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={importType} onValueChange={(v) => setImportType(v as ImportType)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="printers" className="flex items-center gap-2">
                <Printer className="h-4 w-4" />
                Impresoras
              </TabsTrigger>
              <TabsTrigger value="spare_parts" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Repuestos
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="printers" className="mt-4 space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Formato esperado para impresoras:</p>
                <ul className="text-sm text-muted-foreground ml-4 list-disc space-y-1">
                  <li><strong>nombre</strong> (requerido): Nombre de la impresora</li>
                  <li><strong>contador</strong> (opcional): Cantidad de copias</li>
                  <li><strong>color</strong> (opcional): Color en formato #hex</li>
                </ul>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate("printers")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Descargar plantilla
              </Button>
            </TabsContent>
            
            <TabsContent value="spare_parts" className="mt-4 space-y-3">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Formato esperado para repuestos:</p>
                <ul className="text-sm text-muted-foreground ml-4 list-disc space-y-1">
                  <li><strong>codigo</strong> (requerido): Código único del repuesto</li>
                  <li><strong>descripcion</strong> (requerido): Nombre o descripción</li>
                  <li><strong>alta_rotacion</strong> (opcional): si/no</li>
                </ul>
              </div>
              <Button variant="outline" size="sm" onClick={() => downloadTemplate("spare_parts")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Descargar plantilla
              </Button>
            </TabsContent>
          </Tabs>

          {importError && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {importError}
            </div>
          )}

          {importResult && (
            <div className="p-3 text-sm bg-muted rounded-md space-y-2">
              <div className="flex items-center gap-2 text-accent">
                <CheckCircle className="h-4 w-4" />
                <span>{importResult.success} registros importados correctamente</span>
              </div>
              {importResult.errors.length > 0 && (
                <div className="space-y-1">
                  <p className="text-muted-foreground">Errores ({importResult.errors.length}):</p>
                  <ul className="text-xs text-muted-foreground max-h-32 overflow-y-auto space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>- {err}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>... y {importResult.errors.length - 10} errores más</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleImport}
              className="hidden"
              id="csv-upload"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={importLoading}
              className="w-full sm:w-auto"
            >
              {importLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Seleccionar archivo CSV
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Desde Excel: Archivo &gt; Guardar como &gt; CSV (delimitado por comas)
          </p>
        </CardContent>
      </Card>

      {/* Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Backup de Datos
          </CardTitle>
          <CardDescription>
            Descarga una copia de seguridad de toda tu información en formato JSON
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <FileJson className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">El backup incluye:</span>
            </div>
            <ul className="text-sm text-muted-foreground ml-6 space-y-1 list-disc">
              <li>Todas las impresoras con sus datos y contadores</li>
              <li>Todos los repuestos registrados</li>
              <li>Historial completo de cambios de repuestos</li>
            </ul>
          </div>

          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 text-sm text-accent bg-accent/10 rounded-md flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Backup descargado correctamente
            </div>
          )}

          <Button onClick={handleBackup} disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando backup...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Descargar Backup
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Recomendamos hacer un backup regularmente para proteger tu información.
          </p>
        </CardContent>
      </Card>

      {/* Info del sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Versión</span>
            <span className="text-sm font-medium">1.0.0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Formato de fecha</span>
            <span className="text-sm font-medium">DD/MM/YYYY</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-sm text-muted-foreground">Base de datos</span>
            <span className="text-sm font-medium">Supabase</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
