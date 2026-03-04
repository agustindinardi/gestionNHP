"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Check, X, Loader2 } from "lucide-react"

interface Props {
  printerId: string
  currentSerialNumber: string | null
}

export function EditPrinterSerialForm({ printerId, currentSerialNumber }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [serialNumber, setSerialNumber] = useState(currentSerialNumber ?? "")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    const trimmedSerial = serialNumber.trim()
    
    if (trimmedSerial === (currentSerialNumber ?? "")) {
      setIsEditing(false)
      setSerialNumber(currentSerialNumber ?? "")
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from("printers")
      .update({ serial_number: trimmedSerial || null })
      .eq("id", printerId)

    setLoading(false)

    if (!error) {
      setIsEditing(false)
      router.refresh()
    }
  }

  function handleCancel() {
    setSerialNumber(currentSerialNumber ?? "")
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-2 border-b border-border">
        <Input
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          className="h-8 text-sm font-mono"
          placeholder="Ej: ABC123456789"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") handleCancel()
          }}
        />
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-accent" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel} disabled={loading}>
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border">
      <span className="text-sm text-muted-foreground">Número de serie</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium font-mono">
          {currentSerialNumber || <span className="text-muted-foreground italic">Sin asignar</span>}
        </span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(true)}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
