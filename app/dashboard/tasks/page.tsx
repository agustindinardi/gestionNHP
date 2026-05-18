"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  addDaysToYmd,
  formatArgentinaDayLabel,
  formatArgentinaDayLabelShort,
  formatArgentinaDayLabelMobileCompact,
  formatArgentinaFullDate,
  formatArgentinaMonthLabel,
  formatArgentinaTimeValue,
  getArgentinaTodayYmd,
} from "@/lib/argentina-time"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { ClipboardList, History, Loader2, Check, Trash2, Pencil, ChevronLeft, ChevronRight, Plus, ArrowRight } from "lucide-react"

interface PrinterOption {
  id: string
  name: string
}

interface TaskRow {
  id: string
  title: string
  due_date: string
  due_time: string
  printer_id: string | null
  priority: "baja" | "media" | "alta"
  completed_at: string | null
  completed_by: "M" | "A" | "V" | null
  printers?: { name: string } | null
}

const priorityOptions = [
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
] as const

const completedByOptions = ["M", "A", "V"] as const

function sortTasks(tasks: TaskRow[]) {
  const priorityOrder = { alta: 3, media: 2, baja: 1 }
  return [...tasks].sort((a, b) => {
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
    if (priorityDiff !== 0) return priorityDiff
    return a.due_time.localeCompare(b.due_time)
  })
}

function PrinterAutocomplete({
  printers,
  value,
  onChange,
  placeholder,
}: {
  printers: PrinterOption[]
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
}) {
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const selected = printers.find((printer) => printer.id === value)
    setSearch(selected?.name || "")
  }, [value, printers])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const filteredPrinters = useMemo(() => {
    if (!search.trim()) return printers
    const query = search.toLowerCase()
    return printers.filter((printer) => printer.name.toLowerCase().includes(query))
  }, [printers, search])

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        value={search}
        placeholder={placeholder}
        onChange={(event) => {
          setSearch(event.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
      />
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-md">
          <div className="max-h-60 overflow-y-auto">
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onChange(null)
                setSearch("")
                setOpen(false)
              }}
            >
              Sin impresora
            </button>
            {filteredPrinters.length > 0 ? (
              filteredPrinters.map((printer) => (
                <button
                  key={printer.id}
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    onChange(printer.id)
                    setSearch(printer.name)
                    setOpen(false)
                  }}
                >
                  {printer.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No hay coincidencias
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TasksPage() {
  const supabase = createClient()
  const [selectedDate, setSelectedDate] = useState(getArgentinaTodayYmd())
  const [printers, setPrinters] = useState<PrinterOption[]>([])
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [title, setTitle] = useState("")
  const [time, setTime] = useState("")
  const [priority, setPriority] = useState<"baja" | "media" | "alta">("media")
  const [printerId, setPrinterId] = useState<string | null>(null)

  const [completionBy, setCompletionBy] = useState<Record<string, "M" | "A" | "V" | "">>({})
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createDate, setCreateDate] = useState(selectedDate)
  const [editingTask, setEditingTask] = useState<TaskRow | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editTime, setEditTime] = useState("")
  const [editPriority, setEditPriority] = useState<"baja" | "media" | "alta">("media")
  const [editPrinterId, setEditPrinterId] = useState<string | null>(null)
  const [deletingTask, setDeletingTask] = useState<TaskRow | null>(null)
  const [movingTask, setMovingTask] = useState<TaskRow | null>(null)

  const visibleDayList = useMemo(() => {
    return Array.from({ length: 5 }, (_, index) =>
      addDaysToYmd(selectedDate, index - 2)
    )
  }, [selectedDate])

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError(null)

      const today = getArgentinaTodayYmd()
      await supabase
        .from("tasks")
        .update({ due_date: today })
        .lt("due_date", today)
        .is("completed_at", null)

      const [printersRes, tasksRes] = await Promise.all([
        supabase.from("printers").select("id, name").order("name"),
        supabase
          .from("tasks")
          .select("*, printers(name)")
          .eq("due_date", selectedDate)
          .is("completed_at", null)
          .order("due_time", { ascending: true }),
      ])

      setPrinters(printersRes.data || [])
      setTasks(sortTasks(tasksRes.data || []))
      setLoading(false)
    }

    init()
  }, [selectedDate, supabase])

  async function reloadTasks(date: string) {
    setLoading(true)
    setError(null)

    const { data, error: loadError } = await supabase
      .from("tasks")
      .select("*, printers(name)")
      .eq("due_date", date)
      .is("completed_at", null)
      .order("due_time", { ascending: true })

    if (loadError) {
      setError(loadError.message)
    }

    setTasks(sortTasks(data || []))
    setLoading(false)
  }

  async function handleCreateTask(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)

    if (!title.trim() || !time) {
      setError("Completa el titulo y la hora de la tarea")
      setSubmitting(false)
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setError("Debes iniciar sesion")
      setSubmitting(false)
      return
    }

    const { error: insertError } = await supabase.from("tasks").insert({
      user_id: userData.user.id,
      title: title.trim(),
      due_date: createDate,
      due_time: time,
      printer_id: printerId,
      priority,
    })

    if (insertError) {
      setError(insertError.message)
      setSubmitting(false)
      return
    }

    setTitle("")
    setTime("")
    setPriority("media")
    setPrinterId(null)
    setSuccess("Tarea creada")
    setShowCreateDialog(false)
    await reloadTasks(createDate)
    setSubmitting(false)

    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleUpdatePriority(taskId: string, value: "baja" | "media" | "alta") {
    const { error: updateError } = await supabase
      .from("tasks")
      .update({ priority: value })
      .eq("id", taskId)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setTasks((prev) => sortTasks(prev.map((task) => (task.id === taskId ? { ...task, priority: value } : task))))
  }

  async function handleFinishTask(task: TaskRow) {
    const who = completionBy[task.id]
    if (!who) {
      setError("Selecciona quien la hizo antes de completar")
      return
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        completed_at: new Date().toISOString(),
        completed_by: who,
      })
      .eq("id", task.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setCompletionBy((prev) => ({ ...prev, [task.id]: "" }))
    setTasks((prev) => prev.filter((item) => item.id !== task.id))
    setSuccess("Tarea completada")
    setTimeout(() => setSuccess(null), 3000)
  }

  async function handleSaveEdit() {
    if (!editingTask) return

    if (!editTitle.trim() || !editTime) {
      setError("Completa el titulo y la hora")
      return
    }

    const { error: updateError } = await supabase
      .from("tasks")
      .update({
        title: editTitle.trim(),
        due_time: editTime,
        priority: editPriority,
        printer_id: editPrinterId,
      })
      .eq("id", editingTask.id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setEditingTask(null)
    await reloadTasks(selectedDate)
  }

  async function handleDeleteTask() {
    if (!deletingTask) return

    const { error: deleteError } = await supabase.from("tasks").delete().eq("id", deletingTask.id)

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setDeletingTask(null)
    setTasks((prev) => prev.filter((task) => task.id !== deletingTask.id))
  }

  async function handleMoveTaskToNextDay() {
    if (!movingTask) return

    const nextDay = addDaysToYmd(movingTask.due_date, 1)

    const { error: updateError } = await supabase
      .from("tasks")
      .update({ due_date: nextDay })
      .eq("id", movingTask.id)

    if (updateError) {
      setError(updateError.message)
      setMovingTask(null)
      return
    }

    setMovingTask(null)
    setTasks((prev) => prev.filter((task) => task.id !== movingTask.id))
    setSuccess(`Tarea movida al ${formatArgentinaDayLabel(nextDay)}`)
    setTimeout(() => setSuccess(null), 3000)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Tareas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Organiza tareas diarias y seguimiento de pendientes
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            setCreateDate(selectedDate)
            setTitle("")
            setTime("")
            setPriority("media")
            setPrinterId(null)
            setError(null)
            setSuccess(null)
            setShowCreateDialog(true)
          }} size="sm" className="sm:size-default">
            <Plus className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="text-xs sm:text-sm">Agregar</span>
          </Button>
          <Button asChild variant="outline" size="sm" className="sm:size-default">
            <Link href="/dashboard/tasks/history">
              <History className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="text-xs sm:text-sm">Historial</span>
            </Link>
          </Button>
        </div>
      </div>

      <Card className="p-2 sm:p-6">
        <CardHeader className="p-0 mb-2 sm:p-6 sm:mb-0">
          <CardTitle className="text-center text-lg sm:text-xl font-bold">
            {formatArgentinaMonthLabel(selectedDate)}
          </CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            {formatArgentinaFullDate(selectedDate)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-1 sm:gap-4">
            {/* Left arrow button */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 flex-shrink-0 sm:h-10 sm:w-10"
              onClick={() => setSelectedDate(addDaysToYmd(selectedDate, -1))}
              title="Día anterior"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>

            {/* Days container */}
            <div className="flex flex-1 gap-0.5 sm:gap-2 overflow-hidden">
              {visibleDayList.map((day) => {
                const isSelected = day === selectedDate
                const isToday = day === getArgentinaTodayYmd()
                return (
                  <button
                    key={day}
                    type="button"
                    className={cn(
                      "flex-1 min-w-0 rounded-md border px-0.5 py-1 sm:px-2 sm:py-3 text-center text-xs sm:text-sm font-medium transition-all duration-300",
                      isSelected
                        ? "border-primary bg-primary/15 text-primary shadow-sm"
                        : "border-border hover:bg-muted"
                    )}
                    onClick={() => setSelectedDate(day)}
                  >
                    <div className="truncate">
                      <span className="sm:hidden">{formatArgentinaDayLabelMobileCompact(day)}</span>
                      <span className="hidden sm:inline">{formatArgentinaDayLabel(day)}</span>
                    </div>
                    {isToday && (
                      <div className="mt-0.5 text-xs font-semibold text-primary">HOY</div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Right arrow button */}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 flex-shrink-0 sm:h-10 sm:w-10"
              onClick={() => setSelectedDate(addDaysToYmd(selectedDate, 1))}
              title="Día siguiente"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Tareas del dia</CardTitle>
          <CardDescription className="text-sm sm:text-base">{formatArgentinaDayLabel(selectedDate)}</CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {loading ? (
            <div className="flex min-h-[100px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 sm:p-6 text-center text-sm sm:text-base text-muted-foreground">
              No hay tareas para este dia
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div key={task.id} className="rounded-lg border p-3 sm:p-4">
                  <div className="flex flex-col gap-2 sm:gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base sm:text-lg font-semibold truncate">{task.title}</h3>
                          <div
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-semibold text-white flex-shrink-0",
                              task.priority === "baja"
                                ? "bg-yellow-500"
                                : task.priority === "media"
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                            )}
                          >
                            {task.priority === "baja"
                              ? "Baja"
                              : task.priority === "media"
                                ? "Media"
                                : "Alta"}
                          </div>
                        </div>
                        <div className="mt-1 text-sm sm:text-base text-muted-foreground">
                          {formatArgentinaTimeValue(task.due_time)} • {task.printers?.name || "-"}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 sm:w-auto sm:px-2"
                          onClick={() => {
                            setEditingTask(task)
                            setEditTitle(task.title)
                            setEditTime(formatArgentinaTimeValue(task.due_time))
                            setEditPriority(task.priority)
                            setEditPrinterId(task.printer_id)
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="hidden sm:inline ml-2">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 sm:w-auto sm:px-2"
                          onClick={() => setMovingTask(task)}
                          title="Mover al siguiente día"
                        >
                          <ArrowRight className="h-4 w-4" />
                          <span className="hidden sm:inline ml-2">Mover</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive sm:w-auto sm:px-2"
                          onClick={() => setDeletingTask(task)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="hidden sm:inline ml-2">Eliminar</span>
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm sm:text-base">Quien la hizo</Label>
                      <div className="flex gap-2">
                        <Select
                          value={completionBy[task.id] || ""}
                          onValueChange={(value) =>
                            setCompletionBy((prev) => ({
                              ...prev,
                              [task.id]: value as "M" | "A" | "V",
                            }))
                          }
                        >
                          <SelectTrigger className="w-20 h-9 sm:h-10 sm:w-auto text-xs sm:text-sm">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {completedByOptions.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="flex-1 h-10 sm:h-10 text-sm sm:text-base"
                          disabled={!completionBy[task.id]}
                          onClick={() => handleFinishTask(task)}
                        >
                          <Check className="h-4 w-4 sm:h-4 sm:w-4 mr-1" />
                          Completar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar tarea</DialogTitle>
            <DialogDescription>Actualiza los datos de la tarea</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={editTime} onChange={(event) => setEditTime(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={editPriority}
                onValueChange={(value) => setEditPriority(value as TaskRow["priority"])}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Maquina</Label>
              <PrinterAutocomplete
                printers={printers}
                value={editPrinterId}
                onChange={setEditPrinterId}
                placeholder="Escribe el nombre de la impresora"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTask(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Guardar cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        if (!open) {
          setTitle("")
          setTime("")
          setPriority("media")
          setPrinterId(null)
          setError(null)
          setSuccess(null)
        }
        setShowCreateDialog(open)
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva tarea</DialogTitle>
            <DialogDescription>Completa los datos para agregar una tarea</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTask} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-md bg-green-100 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
                {success}
              </div>
            )}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={createDate}
                onChange={(event) => setCreateDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Titulo</Label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input type="time" value={time} onChange={(event) => setTime(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as TaskRow["priority"])}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecciona prioridad" />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Maquina (opcional)</Label>
              <PrinterAutocomplete
                printers={printers}
                value={printerId}
                onChange={setPrinterId}
                placeholder="Escribe el nombre de la impresora"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Agregar tarea"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!movingTask} onOpenChange={(open) => !open && setMovingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover tarea al siguiente día</AlertDialogTitle>
            <AlertDialogDescription>
              {movingTask && (
                <>
                  La tarea "{movingTask.title}" se movera a {formatArgentinaDayLabel(addDaysToYmd(movingTask.due_date, 1))} con toda la misma información.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMovingTask(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={handleMoveTaskToNextDay}
            >
              Mover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarea</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. La tarea se eliminara de forma permanente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingTask(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteTask}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
