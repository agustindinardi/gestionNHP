import Link from "next/link"
import { AlertOctagon, AlertTriangle, CheckCircle2, Eye, type LucideIcon } from "lucide-react"
import { formatNumber } from "@/lib/format-date"
import type { LifeRow, LifeStatus } from "@/lib/metrics"

export const LIFE_STATUS: Record<LifeStatus, { label: string; icon: LucideIcon; color: string }> = {
  critical: { label: "Cambiar ya", icon: AlertOctagon, color: "var(--status-critical)" },
  serious: { label: "Pronto", icon: AlertTriangle, color: "var(--status-serious)" },
  warning: { label: "A vigilar", icon: Eye, color: "var(--status-warning)" },
  good: { label: "OK", icon: CheckCircle2, color: "var(--status-good)" },
}

interface Props {
  rows: LifeRow[]
}

// Medidor por (impresora, categoría): pista neutra + relleno del color de
// estado, siempre acompañado de ícono y etiqueta para no depender del color.
export function LifeStatusList({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Todavía no hay datos de vida útil. Asigná categoría y vida útil a los repuestos y registrá
        cambios para verlos acá.
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {rows.map((row) => {
        const status = LIFE_STATUS[row.status]
        const Icon = status.icon
        const statusLabel = row.overdue ? "Vencida" : status.label
        return (
          <li key={row.key}>
            <Link
              href={`/dashboard/printers/${row.printerId}`}
              className="block rounded-md px-2 py-3 transition-colors hover:bg-muted/60"
              title={`${row.sparePartDescription} — ${formatNumber(row.copiesUsed)} de ${formatNumber(row.totalLife)} copias usadas`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {row.printerName} <span className="text-muted-foreground">· {row.categoryName}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(row.copiesUsed)} / {formatNumber(row.totalLife)} copias
                    {row.overdue && (
                      <>
                        {" · "}
                        <span className="font-medium text-foreground">
                          excedida en {formatNumber(row.copiesUsed - row.totalLife)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-foreground">
                    <Icon className="h-4 w-4" style={{ color: status.color }} aria-hidden />
                    {statusLabel}
                  </span>
                  <span className="w-11 text-right text-sm font-semibold tabular-nums text-foreground">
                    {Math.round(row.percentage)}%
                  </span>
                </div>
              </div>
              <div
                className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(row.percentage)}
                aria-label={`Vida útil restante de ${row.categoryName} en ${row.printerName}`}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${row.percentage}%`, backgroundColor: status.color }}
                />
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
