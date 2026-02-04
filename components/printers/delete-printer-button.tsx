"use client"

import React from "react"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2 } from "lucide-react"

interface Props {
  printerId: string
  printerName: string
}

export function DeletePrinterButton({ printerId, printerName }: Props) {
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  async function handleDelete() {
    setLoading(true)

    // Primero eliminar los cambios de repuestos asociados
    await supabase.from("spare_part_changes").delete().eq("printer_id", printerId)

    // Luego eliminar la impresora
    const { error } = await supabase.from("printers").delete().eq("id", printerId)

    if (error) {
      setLoading(false)
      return
    }

    window.location.href = "/dashboard/printers"
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="w-full sm:w-auto">
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar Impresora
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar impresora</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción eliminará permanentemente la impresora <strong>{printerName}</strong> y todo su historial de cambios de repuestos.
            <br /><br />
            Esta acción no se puede deshacer.
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
              "Eliminar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
