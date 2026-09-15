"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EditManualField } from "@/components/manuals/edit-manual-field"
import { Button } from "@/components/ui/button"
import { BookOpen, Search, Filter, Loader2, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react"

const PAGE_SIZE = 10

function Pager({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t">
      <span className="text-sm text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

interface Manual {
  id: string
  machine_name: string
}

interface ManualEntry {
  id: string
  manual_id: string
  type: "error" | "codigo"
  code: string
  level: string | null
  title: string | null
  detection: string | null
  causes: string | null
  solution: string | null
  description: string | null
  setting: string | null
}

type EditableField =
  | "level"
  | "title"
  | "detection"
  | "causes"
  | "solution"
  | "description"
  | "setting"

type FilterType = "all" | "error" | "codigo"

export default function ManualsPage() {
  const supabase = createClient()
  const [manuals, setManuals] = useState<Manual[]>([])
  const [selectedManual, setSelectedManual] = useState<string>("")
  const [entries, setEntries] = useState<ManualEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<FilterType>("all")
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [errorPage, setErrorPage] = useState(1)
  const [codigoPage, setCodigoPage] = useState(1)

  // Cargar la lista de manuales (para el selector de máquina).
  useEffect(() => {
    async function loadManuals() {
      const { data } = await supabase
        .from("manuals")
        .select("id, machine_name")
        .order("machine_name")
      const list = data || []
      setManuals(list)
      if (list.length > 0) {
        setSelectedManual(list[0].id)
      } else {
        setLoading(false)
      }
    }
    loadManuals()
  }, [supabase])

  // Cargar las entries del manual seleccionado.
  useEffect(() => {
    if (!selectedManual) return
    async function loadEntries() {
      setLoading(true)
      const { data } = await supabase
        .from("manual_entries")
        .select("*")
        .eq("manual_id", selectedManual)
        .order("code")
      setEntries((data as ManualEntry[]) || [])
      setLoading(false)
    }
    loadEntries()
  }, [selectedManual, supabase])

  // Debounce del buscador.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300)
    return () => clearTimeout(t)
  }, [searchInput])

  // Volver a la primera página al cambiar búsqueda, filtro o máquina.
  useEffect(() => {
    setErrorPage(1)
    setCodigoPage(1)
  }, [search, filterType, selectedManual])

  function handleFieldUpdate(
    entryId: string,
    field: EditableField,
    newValue: string | null
  ) {
    setEntries((prev) =>
      prev.map((e) => (e.id === entryId ? { ...e, [field]: newValue } : e))
    )
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false
      if (!q) return true
      const haystack = [
        e.code,
        e.title,
        e.detection,
        e.causes,
        e.solution,
        e.description,
        e.setting,
      ]
      return haystack.some((f) => (f ?? "").toLowerCase().includes(q))
    })
  }, [entries, filterType, search])

  const errors = filtered.filter((e) => e.type === "error")
  const codigos = filtered.filter((e) => e.type === "codigo")

  const showErrors = filterType === "all" || filterType === "error"
  const showCodigos = filterType === "all" || filterType === "codigo"

  const errorTotalPages = Math.max(1, Math.ceil(errors.length / PAGE_SIZE))
  const codigoTotalPages = Math.max(1, Math.ceil(codigos.length / PAGE_SIZE))
  const safeErrorPage = Math.min(errorPage, errorTotalPages)
  const safeCodigoPage = Math.min(codigoPage, codigoTotalPages)
  const pagedErrors = errors.slice((safeErrorPage - 1) * PAGE_SIZE, safeErrorPage * PAGE_SIZE)
  const pagedCodigos = codigos.slice((safeCodigoPage - 1) * PAGE_SIZE, safeCodigoPage * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Manuales</h1>
        <p className="text-muted-foreground mt-1">
          Consulta errores (SC) y códigos (SP) de servicio por máquina
        </p>
      </div>

      {/* Selector de máquina + filtros */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <Select value={selectedManual} onValueChange={setSelectedManual}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <BookOpen className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Selecciona una máquina" />
          </SelectTrigger>
          <SelectContent>
            {manuals.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.machine_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="error">Errores</SelectItem>
            <SelectItem value="codigo">Códigos</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 sm:min-w-[220px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por código, nombre, síntoma, causa..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : manuals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No hay manuales cargados</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Aplica el seed de la base de datos para ver los códigos y errores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {showErrors && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Errores ({errors.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {errors.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">ERROR</TableHead>
                          <TableHead className="w-[70px]">NIVEL</TableHead>
                          <TableHead>SÍNTOMA</TableHead>
                          <TableHead>POSIBLE CAUSA</TableHead>
                          <TableHead>SOLUCIÓN</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedErrors.map((e) => (
                          <TableRow key={e.id} className="align-top">
                            <TableCell className="font-mono font-medium align-top">
                              <div>{e.code}</div>
                              <div className="mt-1 text-xs font-sans font-normal text-muted-foreground">
                                <EditManualField
                                  entryId={e.id}
                                  field="title"
                                  value={e.title}
                                  emptyLabel="Sin título"
                                  placeholder="Título del error"
                                  onUpdate={(f, v) => handleFieldUpdate(e.id, f, v)}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <EditManualField
                                entryId={e.id}
                                field="level"
                                value={e.level}
                                emptyLabel="—"
                                placeholder="A/B/C/D"
                                onUpdate={(f, v) => handleFieldUpdate(e.id, f, v)}
                              />
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <EditManualField
                                entryId={e.id}
                                field="detection"
                                value={e.detection}
                                emptyLabel="Sin síntoma"
                                placeholder="Síntoma / detección"
                                onUpdate={(f, v) => handleFieldUpdate(e.id, f, v)}
                              />
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <EditManualField
                                entryId={e.id}
                                field="causes"
                                value={e.causes}
                                emptyLabel="Sin causa"
                                placeholder="Posible causa"
                                onUpdate={(f, v) => handleFieldUpdate(e.id, f, v)}
                              />
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <EditManualField
                                entryId={e.id}
                                field="solution"
                                value={e.solution}
                                emptyLabel="—"
                                placeholder="Solución"
                                onUpdate={(f, v) => handleFieldUpdate(e.id, f, v)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pager page={safeErrorPage} totalPages={errorTotalPages} onPage={setErrorPage} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">Sin resultados.</p>
                )}
              </CardContent>
            </Card>
          )}

          {showCodigos && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Códigos ({codigos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {codigos.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">CÓDIGO</TableHead>
                          <TableHead className="w-[22%]">NOMBRE</TableHead>
                          <TableHead>DESCRIPCIÓN</TableHead>
                          <TableHead className="w-[18%]">AJUSTE</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pagedCodigos.map((e) => (
                          <TableRow key={e.id} className="align-top">
                            <TableCell className="font-mono font-medium align-top">
                              {e.code}
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <EditManualField
                                entryId={e.id}
                                field="title"
                                value={e.title}
                                emptyLabel="Sin nombre"
                                placeholder="Nombre del ajuste"
                                onUpdate={(f, v) => handleFieldUpdate(e.id, f, v)}
                              />
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <EditManualField
                                entryId={e.id}
                                field="description"
                                value={e.description}
                                emptyLabel="Sin descripción"
                                placeholder="Descripción"
                                onUpdate={(f, v) => handleFieldUpdate(e.id, f, v)}
                              />
                            </TableCell>
                            <TableCell className="align-top text-sm font-mono">
                              <EditManualField
                                entryId={e.id}
                                field="setting"
                                value={e.setting}
                                emptyLabel="—"
                                placeholder="Rango / default"
                                onUpdate={(f, v) => handleFieldUpdate(e.id, f, v)}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Pager page={safeCodigoPage} totalPages={codigoTotalPages} onPage={setCodigoPage} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-4">Sin resultados.</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
