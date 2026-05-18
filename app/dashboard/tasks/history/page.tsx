"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { formatDate } from "@/lib/format-date"
import { formatArgentinaDateTime, formatArgentinaTimeValue } from "@/lib/argentina-time"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ClipboardList, Loader2 } from "lucide-react"

interface TaskRow {
  id: string
  title: string
  due_date: string
  due_time: string
  completed_at: string | null
  completed_by: string | null
  priority: "baja" | "media" | "alta"
  printers?: { name: string } | null
}

export default function TasksHistoryPage() {
  const supabase = createClient()
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState("")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 50

  useEffect(() => {
    async function loadTasks() {
      setLoading(true)
      setOffset(0)
      const { data, error } = await supabase
        .from("tasks")
        .select("*, printers(name)")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .range(0, pageSize - 1)

      if (!error && data) {
        setTasks(data)
        setHasMore(data.length === pageSize)
      }
      setLoading(false)
    }

    loadTasks()
  }, [supabase])

  async function loadMore() {
    setLoadingMore(true)
    const newOffset = offset + pageSize
    const { data, error } = await supabase
      .from("tasks")
      .select("*, printers(name)")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .range(newOffset, newOffset + pageSize - 1)

    if (!error && data) {
      setTasks((prev) => [...prev, ...data])
      setOffset(newOffset)
      setHasMore(data.length === pageSize)
    }
    setLoadingMore(false)
  }

  const filteredTasks = useMemo(() => {
    if (!search.trim()) return tasks
    const query = search.toLowerCase()
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(query) ||
        task.printers?.name?.toLowerCase().includes(query)
    )
  }, [tasks, search])

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2 sm:gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Historial de tareas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
            Registro de tareas completadas
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="sm:size-default">
          <Link href="/dashboard/tasks">
            Volver a tareas
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <ClipboardList className="h-4 w-4 sm:h-5 sm:w-5 text-accent" />
            Tareas finalizadas
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Ultimas tareas marcadas como completadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search" className="text-xs sm:text-sm">
              Buscar por tarea o maquina
            </Label>
            <Input
              id="search"
              placeholder="Ejemplo: BYTO1, revisar papel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs sm:text-sm h-8 sm:h-10"
            />
          </div>

          {loading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 sm:p-6 text-center text-xs sm:text-sm text-muted-foreground">
              {search ? "No hay tareas que coincidan con tu busqueda" : "No hay tareas finalizadas todavia"}
            </div>
          ) : (
            <>
              {/* Vista Desktop - Tabla */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">Tarea</TableHead>
                      <TableHead className="text-xs sm:text-sm">Programada</TableHead>
                      <TableHead className="text-xs sm:text-sm">Completada</TableHead>
                      <TableHead className="text-xs sm:text-sm">Maquina</TableHead>
                      <TableHead className="text-xs sm:text-sm">Prioridad</TableHead>
                      <TableHead className="text-xs sm:text-sm">Quien</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium text-xs sm:text-sm">{task.title}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {formatDate(task.due_date)} {formatArgentinaTimeValue(task.due_time)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {task.completed_at ? formatArgentinaDateTime(task.completed_at) : "-"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm font-medium">
                          {task.printers?.name || "-"}
                        </TableCell>
                        <TableCell className="capitalize text-xs sm:text-sm">
                          {task.priority === "baja"
                            ? "Baja"
                            : task.priority === "media"
                              ? "Media"
                              : "Alta"}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">{task.completed_by || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Vista Mobile - Cards */}
              <div className="sm:hidden space-y-3">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="border rounded-lg p-3 bg-card space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-medium text-sm flex-1">{task.title}</h3>
                      <span
                        className={`text-xs px-2 py-1 rounded-full whitespace-nowrap font-medium ${
                          task.priority === "alta"
                            ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
                            : task.priority === "media"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                        }`}
                      >
                        {task.priority === "baja"
                          ? "Baja"
                          : task.priority === "media"
                            ? "Media"
                            : "Alta"}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Programada:</span> {formatDate(task.due_date)} {formatArgentinaTimeValue(task.due_time)}
                      </div>
                      <div>
                        <span className="font-medium">Completada:</span> {task.completed_at ? formatArgentinaDateTime(task.completed_at) : "-"}
                      </div>
                      <div>
                        <span className="font-medium">Máquina:</span> {task.printers?.name || "-"}
                      </div>
                      <div>
                        <span className="font-medium">Quién:</span> {task.completed_by || "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                <div className="text-xs text-muted-foreground text-center">
                  Mostrando {filteredTasks.length} de {tasks.length} tareas
                </div>
                {!search && hasMore && (
                  <Button
                    onClick={loadMore}
                    disabled={loadingMore}
                    variant="outline"
                    className="w-full"
                    size="sm"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      "Cargar más tareas"
                    )}
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
