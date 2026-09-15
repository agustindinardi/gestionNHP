"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Check, X, Loader2 } from "lucide-react"

type ManualField =
  | "level"
  | "title"
  | "detection"
  | "causes"
  | "solution"
  | "description"
  | "setting"

interface Props {
  entryId: string
  field: ManualField
  value: string | null
  placeholder?: string
  emptyLabel?: string
  onUpdate: (field: ManualField, newValue: string | null) => void
}

export function EditManualField({
  entryId,
  field,
  value,
  placeholder,
  emptyLabel = "Sin datos",
  onUpdate,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSave() {
    const trimmed = draft.trim()

    if (trimmed === (value ?? "")) {
      setIsEditing(false)
      setDraft(value ?? "")
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from("manual_entries")
      .update({ [field]: trimmed || null, updated_at: new Date().toISOString() })
      .eq("id", entryId)

    setLoading(false)

    if (!error) {
      setIsEditing(false)
      onUpdate(field, trimmed || null)
    }
  }

  function handleCancel() {
    setDraft(value ?? "")
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-start gap-1">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[60px] text-sm flex-1"
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSave()
            if (e.key === "Escape") handleCancel()
          }}
        />
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 text-accent" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleCancel} disabled={loading}>
            <X className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-1">
      <span className="flex-1 whitespace-pre-wrap">
        {value || <span className="italic text-muted-foreground">{emptyLabel}</span>}
      </span>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => setIsEditing(true)}
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  )
}
