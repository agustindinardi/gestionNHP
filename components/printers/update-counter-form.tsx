"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"

interface Props {
  printerId: string
  currentCounter: number
}

export function UpdateCounterForm({ printerId, currentCounter }: Props) {
  const [newCounter, setNewCounter] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    // Usar el valor exacto como string y convertir a BigInt para números grandes
    const cleanValue = newCounter.trim()
    if (!cleanValue || !/^\d+$/.test(cleanValue)) {
      setError("Por favor ingresa un número válido")
      setLoading(false)
      return
    }

    const counterValue = Number(cleanValue)

    const { error: updateError } = await supabase
      .from("printers")
      .update({ counter: counterValue, updated_at: new Date().toISOString() })
      .eq("id", printerId)

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setNewCounter("")
    setLoading(false)
    router.refresh()

    setTimeout(() => setSuccess(false), 2000)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-2 text-sm text-destructive bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      {success && (
        <div className="p-2 text-sm text-accent bg-accent/10 rounded-md">
          Contador actualizado correctamente
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="newCounter">Nuevo contador</Label>
        <div className="flex gap-2">
          <Input
            id="newCounter"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder={currentCounter.toLocaleString("es-AR")}
            value={newCounter}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "")
              setNewCounter(val)
            }}
            className="flex-1"
          />
          <Button type="submit" disabled={loading || !newCounter}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>
    </form>
  )
}
