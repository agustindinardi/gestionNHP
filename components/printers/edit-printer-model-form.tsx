"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Check, X, Loader2 } from "lucide-react"

interface Props {
  printerId: string
  currentModel: string | null
}

export function EditPrinterModelForm({ printerId, currentModel }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [model, setModel] = useState(currentModel ?? "")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    const trimmedModel = model.trim()

    if (trimmedModel === (currentModel ?? "")) {
      setIsEditing(false)
      setModel(currentModel ?? "")
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from("printers")
      .update({ model: trimmedModel || null })
      .eq("id", printerId)

    setLoading(false)

    if (!error) {
      setIsEditing(false)
      router.refresh()
    }
  }

  function handleCancel() {
    setModel(currentModel ?? "")
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-2 border-b border-border">
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="h-8 text-sm"
          placeholder="Ej: MP 7502"
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
      <span className="text-sm text-muted-foreground">Modelo</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {currentModel || <span className="text-muted-foreground italic">Sin asignar</span>}
        </span>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(true)}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
