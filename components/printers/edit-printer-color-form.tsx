"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Pencil, Check, X, Loader2 } from "lucide-react"

interface Props {
  printerId: string
  currentColor: string
}

const PRESET_COLORS = [
  "#3b82f6", // blue
  "#ef4444", // red
  "#22c55e", // green
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
  "#6366f1", // indigo
  "#84cc16", // lime
]

export function EditPrinterColorForm({ printerId, currentColor }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [color, setColor] = useState(currentColor || "#3b82f6")
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    if (color === currentColor) {
      setIsEditing(false)
      return
    }

    setLoading(true)

    const { error } = await supabase
      .from("printers")
      .update({ color })
      .eq("id", printerId)

    setLoading(false)

    if (!error) {
      setIsEditing(false)
      router.refresh()
    }
  }

  function handleCancel() {
    setColor(currentColor || "#3b82f6")
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="py-2 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Color</span>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-8 w-12 p-1 cursor-pointer"
            />
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 text-accent" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel} disabled={loading}>
              <X className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((presetColor) => (
            <button
              key={presetColor}
              type="button"
              onClick={() => setColor(presetColor)}
              className={`w-7 h-7 rounded-md border-2 transition-transform hover:scale-110 ${
                color === presetColor ? "border-foreground ring-2 ring-offset-2 ring-primary" : "border-transparent"
              }`}
              style={{ backgroundColor: presetColor }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-border">
      <span className="text-sm text-muted-foreground">Color</span>
      <div className="flex items-center gap-2">
        <div
          className="w-6 h-6 rounded-md border border-border"
          style={{ backgroundColor: currentColor || "#3b82f6" }}
        />
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setIsEditing(true)}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
