"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Pencil, Trash2, Loader2 } from "lucide-react"

interface SparePart {
  id: string
  code: string
  description: string
  high_rotation: boolean
}

interface Props {
  sparePart: SparePart
}

export function SparePartActions({ sparePart }: Props) {
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [code, setCode] = useState(sparePart.code)
  const [description, setDescription] = useState(sparePart.description)
  const [highRotation, setHighRotation] = useState(sparePart.high_rotation)
  
  const router = useRouter()
  const supabase = createClient()

  async function handleSave() {
    if (!code.trim() || !description.trim()) return
    
    setLoading(true)
    
    const { error } = await supabase
      .from("spare_parts")
      .update({
        code: code.trim(),
        description: description.trim(),
        high_rotation: highRotation,
      })
      .eq("id", sparePart.id)
    
    setLoading(false)
    
    if (!error) {
      setIsEditOpen(false)
      router.refresh()
    }
  }

  async function handleDelete() {
    setLoading(true)
    
    const { error } = await supabase
      .from("spare_parts")
      .delete()
      .eq("id", sparePart.id)
    
    setLoading(false)
    
    if (!error) {
      setIsDeleteOpen(false)
      router.refresh()
    }
  }

  function resetForm() {
    setCode(sparePart.code)
    setDescription(sparePart.description)
    setHighRotation(sparePart.high_rotation)
  }

  return (
    <>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            resetForm()
            setIsEditOpen(true)
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Repuesto</DialogTitle>
            <DialogDescription>
              Modifica la información del repuesto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ej: RM1-1234"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Rodillo de transferencia"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="high_rotation"
                checked={highRotation}
                onCheckedChange={(checked) => setHighRotation(checked as boolean)}
              />
              <Label htmlFor="high_rotation" className="cursor-pointer">
                Alta Rotación
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading || !code.trim() || !description.trim()}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar repuesto?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar el repuesto <strong>{sparePart.code}</strong> ({sparePart.description}).
              <br /><br />
              <span className="text-destructive">
                Nota: No se podrá eliminar si tiene cambios registrados en el historial.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
