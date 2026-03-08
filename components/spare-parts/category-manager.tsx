"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Loader2, FolderPlus, Trash2, Pencil } from "lucide-react"

interface Category {
  id: string
  name: string
}

interface Props {
  categories: Category[]
}

export function CategoryManager({ categories: initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories)
  const [isOpen, setIsOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editName, setEditName] = useState("")
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return
    
    setLoading(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from("spare_part_categories")
      .insert({
        user_id: user.id,
        name: newCategoryName.trim(),
      })
      .select()
      .single()

    setLoading(false)

    if (!error && data) {
      setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewCategoryName("")
      router.refresh()
    }
  }

  async function handleUpdateCategory() {
    if (!editingCategory || !editName.trim()) return
    
    setLoading(true)
    
    const { error } = await supabase
      .from("spare_part_categories")
      .update({ name: editName.trim() })
      .eq("id", editingCategory.id)

    setLoading(false)

    if (!error) {
      setCategories(categories.map(c => 
        c.id === editingCategory.id ? { ...c, name: editName.trim() } : c
      ).sort((a, b) => a.name.localeCompare(b.name)))
      setEditingCategory(null)
      setEditName("")
      router.refresh()
    }
  }

  async function handleDeleteCategory() {
    if (!deletingCategory) return
    
    setLoading(true)
    
    const { error } = await supabase
      .from("spare_part_categories")
      .delete()
      .eq("id", deletingCategory.id)

    setLoading(false)

    if (!error) {
      setCategories(categories.filter(c => c.id !== deletingCategory.id))
      setDeletingCategory(null)
      router.refresh()
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <FolderPlus className="mr-2 h-4 w-4" />
            Categorías
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-accent" />
              Gestionar Categorías
            </DialogTitle>
            <DialogDescription>
              Crea y administra las categorías de repuestos
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Create new category */}
            <div className="flex gap-2">
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nueva categoría..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleCreateCategory()
                  }
                }}
              />
              <Button onClick={handleCreateCategory} disabled={loading || !newCategoryName.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar"}
              </Button>
            </div>

            {/* Category list */}
            {categories.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                  >
                    <span className="text-sm font-medium">{category.name}</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => {
                          setEditingCategory(category)
                          setEditName(category.name)
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setDeletingCategory(category)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay categorías creadas
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoría</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nombre</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleUpdateCategory()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCategory(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCategory} disabled={loading || !editName.trim()}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingCategory} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar categoría?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás a punto de eliminar la categoría <strong>{deletingCategory?.name}</strong>.
              Los repuestos que tengan esta categoría quedarán sin categoría asignada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
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
