"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Check, X, Loader2 } from "lucide-react"

interface Props {
  changeId: string
  currentDetail: string | null
  onUpdate: (newDetail: string | null) => void
}

export function EditChangeDetailForm({ changeId, currentDetail, onUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [detail, setDetail] = useState(currentDetail ?? "")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSave(e: React.MouseEvent) {
    e.stopPropagation()
    
    const trimmedDetail = detail.trim()
    
    if (trimmedDetail === (currentDetail ?? "")) {
      setIsEditing(false)
      setDetail(currentDetail ?? "")
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from("spare_part_changes")
      .update({ detail: trimmedDetail || null })
      .eq("id", changeId)

    setLoading(false)

    if (!error) {
      setIsEditing(false)
      onUpdate(trimmedDetail || null)
    }
  }

  function handleCancel(e: React.MouseEvent) {
    e.stopPropagation()
    setDetail(currentDetail ?? "")
    setIsEditing(false)
  }

  function handleStartEdit(e: React.MouseEvent) {
    e.stopPropagation()
    setIsEditing(true)
  }

  if (isEditing) {
    return (
      <div 
        className="flex items-center gap-2 mt-2 pt-2 border-t border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          className="h-8 text-xs flex-1"
          placeholder="Agregar observaciones..."
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave(e as unknown as React.MouseEvent)
            if (e.key === "Escape") handleCancel(e as unknown as React.MouseEvent)
          }}
        />
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-accent" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCancel} disabled={loading}>
          <X className="h-3 w-3 text-destructive" />
        </Button>
      </div>
    )
  }

  return (
    <div 
      className="flex items-center gap-2 mt-2 pt-2 border-t border-border text-xs text-muted-foreground"
      onClick={(e) => e.stopPropagation()}
    >
      <span className="flex-1 truncate">
        {currentDetail || <span className="italic">Sin observaciones</span>}
      </span>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-6 w-6 shrink-0" 
        onClick={handleStartEdit}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  )
}
