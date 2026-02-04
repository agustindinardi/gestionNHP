"use client"

import { useRouter } from "next/navigation"

import React from "react"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Loader2, Package } from "lucide-react"

export default function NewSparePartPage() {
  const [code, setCode] = useState("")
  const [description, setDescription] = useState("")
  const [highRotation, setHighRotation] = useState(false)
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

    const { error: insertError } = await supabase.from("spare_parts").insert({
      user_id: user.id,
      code: code.toUpperCase(),
      description,
      high_rotation: highRotation,
    })

    if (insertError) {
      if (insertError.code === "23505") {
        setError("Ya existe un repuesto con ese código")
      } else {
        setError(insertError.message)
      }
      setLoading(false)
      return
    }

    window.location.href = "/dashboard/spare-parts"
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/dashboard/spare-parts">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Nuevo Repuesto</h1>
          <p className="text-muted-foreground mt-1">
            Agrega un nuevo repuesto al catálogo
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-accent" />
            Datos del Repuesto
          </CardTitle>
          <CardDescription>
            Completa los datos para registrar el repuesto
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
              <Label htmlFor="code">Código del Repuesto</Label>
              <Input
                id="code"
                placeholder="Ej: TK-8515K"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="uppercase"
                required
              />
              <p className="text-xs text-muted-foreground">
                Código único de identificación del repuesto
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción / Nombre</Label>
              <Input
                id="description"
                placeholder="Ej: Tóner Negro Original"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Nombre descriptivo del repuesto
              </p>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-muted/50 rounded-lg">
              <Checkbox
                id="highRotation"
                checked={highRotation}
                onCheckedChange={(checked) => setHighRotation(checked === true)}
              />
              <div className="space-y-1">
                <Label
                  htmlFor="highRotation"
                  className="text-sm font-medium cursor-pointer"
                >
                  Repuesto de Alta Rotación
                </Label>
                <p className="text-xs text-muted-foreground">
                  Marca este repuesto si se cambia con frecuencia
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" asChild className="flex-1 bg-transparent">
                <Link href="/dashboard/spare-parts">Cancelar</Link>
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar Repuesto"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
