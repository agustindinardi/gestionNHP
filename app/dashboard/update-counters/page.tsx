"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatNumber } from "@/lib/format-date"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, Loader2, Check, AlertTriangle, ArrowUp, ArrowDown, Minus } from "lucide-react"

interface MatchedRow {
  id: string
  name: string
  currentCounter: number
  newCounter: number
  diff: number
}

interface SkippedRow {
  name: string
  raw: string
  reason: string
}

interface Preview {
  matched: MatchedRow[]
  skipped: SkippedRow[]
}

interface UpdateResult {
  success: number
  errors: string[]
}

export default function UpdateCountersPage() {
  const supabase = createClient()
  const [rawText, setRawText] = useState("")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UpdateResult | null>(null)

  function normalize(name: string): string {
    return name.trim().toLowerCase()
  }

  async function handleParse() {
    setError(null)
    setResult(null)
    setPreview(null)

    if (!rawText.trim()) {
      setError("Pega los datos del Excel antes de actualizar")
      return
    }

    setLoading(true)

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("Debes iniciar sesión")
      setLoading(false)
      return
    }

    const { data: printers, error: fetchError } = await supabase
      .from("printers")
      .select("id, name, counter")

    if (fetchError) {
      setError(fetchError.message)
      setLoading(false)
      return
    }

    // Mapa por nombre normalizado. Si hay nombres duplicados, se marcan como ambiguos.
    const byName = new Map<string, { id: string; name: string; counter: number }[]>()
    for (const printer of printers || []) {
      const key = normalize(printer.name)
      const existing = byName.get(key) || []
      existing.push({ id: printer.id, name: printer.name, counter: printer.counter ?? 0 })
      byName.set(key, existing)
    }

    const matched: MatchedRow[] = []
    const skipped: SkippedRow[] = []
    const seen = new Set<string>()

    const lines = rawText.split(/\r?\n/)
    for (const line of lines) {
      if (!line.trim()) continue

      const cols = line.split("\t")
      const name = (cols[0] ?? "").trim()
      const rawCounter = (cols[1] ?? "").trim()

      if (!name) continue

      const matches = byName.get(normalize(name))

      if (!matches || matches.length === 0) {
        skipped.push({ name, raw: rawCounter, reason: "No encontrada" })
        continue
      }

      if (matches.length > 1) {
        skipped.push({ name, raw: rawCounter, reason: "Nombre duplicado (ambiguo)" })
        continue
      }

      // Validar que la segunda columna sea un número (dígitos + separadores de miles).
      if (!rawCounter || !/^[\d.\s,]+$/.test(rawCounter)) {
        skipped.push({ name, raw: rawCounter || "(vacío)", reason: "Contador inválido" })
        continue
      }

      const newCounter = Number(rawCounter.replace(/\D/g, ""))
      if (isNaN(newCounter)) {
        skipped.push({ name, raw: rawCounter, reason: "Contador inválido" })
        continue
      }

      const printer = matches[0]

      // Evitar duplicar la misma máquina si aparece dos veces en el texto.
      if (seen.has(printer.id)) {
        skipped.push({ name, raw: rawCounter, reason: "Repetida en el texto" })
        continue
      }
      seen.add(printer.id)

      matched.push({
        id: printer.id,
        name: printer.name,
        currentCounter: printer.counter,
        newCounter,
        diff: newCounter - printer.counter,
      })
    }

    setPreview({ matched, skipped })
    setLoading(false)
  }

  async function handleConfirm() {
    if (!preview) return

    setConfirming(true)
    setError(null)

    let success = 0
    const errors: string[] = []

    for (const row of preview.matched) {
      const { error: updateError } = await supabase
        .from("printers")
        .update({ counter: row.newCounter, updated_at: new Date().toISOString() })
        .eq("id", row.id)

      if (updateError) {
        errors.push(`${row.name}: ${updateError.message}`)
      } else {
        success++
      }
    }

    setResult({ success, errors })
    setPreview(null)
    setRawText("")
    setConfirming(false)
  }

  function handleCancel() {
    setPreview(null)
    setRawText("")
    setError(null)
    setResult(null)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Actualizar contadores</h1>
        <p className="text-muted-foreground mt-1">
          Pega los datos del Excel para actualizar los contadores de varias máquinas a la vez
        </p>
      </div>

      {result && (
        <Card className="border-green-500/40">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <p className="font-medium">
                {result.success} contador{result.success === 1 ? "" : "es"} actualizado
                {result.success === 1 ? "" : "s"} correctamente
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-sm font-medium text-destructive">Errores:</p>
                {result.errors.map((err, i) => (
                  <p key={i} className="text-sm text-destructive">{err}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {!preview && (
        <Card>
          <CardHeader>
            <CardTitle>Pegar datos</CardTitle>
            <CardDescription>
              Una máquina por línea: nombre y contador separados por tabulación (columnas del Excel).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="paste">Datos</Label>
              <Textarea
                id="paste"
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={"MED1\t2412826\nMED2\t1643098\nG12501\t6690898"}
                className="min-h-[220px] font-mono text-sm"
              />
            </div>
            <Button onClick={handleParse} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
          </CardContent>
        </Card>
      )}

      {preview && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Máquinas a actualizar ({preview.matched.length})</CardTitle>
              <CardDescription>
                Revisa los cambios antes de confirmar. Una diferencia en rojo indica que el nuevo
                contador es menor al actual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {preview.matched.length > 0 ? (
                <div className="space-y-2">
                  {preview.matched.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium truncate">{row.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatNumber(row.currentCounter)} → {formatNumber(row.newCounter)}
                        </p>
                      </div>
                      <div
                        className={
                          row.diff > 0
                            ? "flex items-center gap-1 font-semibold text-green-600"
                            : row.diff < 0
                              ? "flex items-center gap-1 font-semibold text-red-600"
                              : "flex items-center gap-1 font-semibold text-muted-foreground"
                        }
                      >
                        {row.diff > 0 ? (
                          <ArrowUp className="h-4 w-4" />
                        ) : row.diff < 0 ? (
                          <ArrowDown className="h-4 w-4" />
                        ) : (
                          <Minus className="h-4 w-4" />
                        )}
                        {row.diff > 0 ? "+" : ""}
                        {formatNumber(row.diff)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Ninguna máquina del texto coincide con tus impresoras.
                </p>
              )}
            </CardContent>
          </Card>

          {preview.skipped.length > 0 && (
            <Card className="border-yellow-500/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  No encontradas / se omitirán ({preview.skipped.length})
                </CardTitle>
                <CardDescription>
                  Estas filas no se actualizarán.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {preview.skipped.map((row, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span className="font-medium truncate">
                        {row.name} <span className="text-muted-foreground font-normal">— {row.raw}</span>
                      </span>
                      <span className="text-muted-foreground shrink-0">{row.reason}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={confirming}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={confirming || preview.matched.length === 0}
              className="flex-1 sm:flex-none"
            >
              {confirming ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Confirmar ({preview.matched.length})
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
