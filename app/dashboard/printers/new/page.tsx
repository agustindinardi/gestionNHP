"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Printer } from "lucide-react"

const colorOptions = [
  { name: "Azul", value: "#3b82f6" },
  { name: "Verde", value: "#22c55e" },
  { name: "Rojo", value: "#ef4444" },
  { name: "Naranja", value: "#f97316" },
  { name: "Morado", value: "#a855f7" },
  { name: "Rosa", value: "#ec4899" },
  { name: "Cian", value: "#06b6d4" },
  { name: "Amarillo", value: "#eab308" },
]

export default function NewPrinterPage() {
  const [name, setName] = useState("")
  const [counter, setCounter] = useState("")
  const [color, setColor] = useState("#3b82f6")
  const [customColor, setCustomColor] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Debes iniciar sesión")
      setLoading(false)
      return
    }

    const finalColor = customColor || color
    // Parsear el contador como string limpio, sin conversiones automáticas
    const cleanCounter = counter.replace(/[^0-9]/g, "")
    const counterValue = cleanCounter === "" ? 0 : parseInt(cleanCounter, 10)

    const { error: insertError } = await supabase.from("printers").insert({
      user_id: user.id,
      name,
      counter: counterValue,
      color: finalColor,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    window.location.href = "/dashboard/printers"
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/printers">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Nueva Impresora</h1>
          <p className="text-muted-foreground mt-1">
            Registra una nueva impresora en el sistema
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            Datos de la Impresora
          </CardTitle>
          <CardDescription>
            Completa los datos para registrar la impresora
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Nombre de la impresora *</Label>
              <Input
                id="name"
                placeholder="Ej: Canon ImageRunner 4055"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="counter">Contador Inicial (copias)</Label>
              <Input
                id="counter"
                type="text"
                inputMode="numeric"
                placeholder="Ej: 150000"
                value={counter}
                onChange={(e) => setCounter(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Cantidad de copias actuales. Si no lo conoces, déjalo vacío.
              </p>
            </div>

            <div className="space-y-3">
              <Label>Color de Identificación</Label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setColor(option.value)
                      setCustomColor("")
                    }}
                    className={`w-10 h-10 rounded-lg border-2 transition-all ${
                      color === option.value && !customColor
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: option.value }}
                    title={option.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="customColor" className="text-sm whitespace-nowrap">
                  Color personalizado:
                </Label>
                <Input
                  id="customColor"
                  type="color"
                  className="w-16 h-10 p-1 cursor-pointer"
                  value={customColor || color}
                  onChange={(e) => setCustomColor(e.target.value)}
                />
                {customColor && (
                  <span className="text-xs text-muted-foreground">{customColor}</span>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/dashboard/printers">Cancelar</Link>
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || !name.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Impresora"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
