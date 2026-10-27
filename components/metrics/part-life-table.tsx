import { formatNumber } from "@/lib/format-date"
import { MIN_RELIABLE_SAMPLES, type PartLifeStats } from "@/lib/metrics"

interface Props {
  stats: PartLifeStats[]
}

function formatDiff(real: number, nominal: number) {
  const pct = Math.round(((real - nominal) / nominal) * 100)
  if (pct === 0) return "igual"
  return `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`
}

// Vida útil estimada por el cliente vs. la observada en los cambios registrados.
export function PartLifeTable({ stats }: Props) {
  if (stats.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Hacen falta al menos dos cambios del mismo repuesto en una misma máquina para calcular cuánto
        duró.
      </p>
    )
  }

  return (
    <div className="-mx-2 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="px-2 py-2 font-medium">Repuesto</th>
            <th className="px-2 py-2 text-right font-medium">Estimado</th>
            <th className="px-2 py-2 text-right font-medium">Promedio real</th>
            <th className="px-2 py-2 text-right font-medium">Mediana</th>
            <th className="px-2 py-2 text-right font-medium">Diferencia</th>
            <th className="px-2 py-2 text-right font-medium">Cambios</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {stats.map((row) => {
            const lowData = row.samples < MIN_RELIABLE_SAMPLES
            return (
              <tr key={row.sparePartId} className="border-b border-border/60 hover:bg-muted/40">
                <td className="max-w-[240px] px-2 py-2">
                  <p className="font-medium text-foreground">{row.code}</p>
                  <p className="truncate text-xs text-muted-foreground" title={row.description}>
                    {row.description}
                  </p>
                </td>
                <td className="px-2 py-2 text-right text-muted-foreground">
                  {row.nominal ? formatNumber(row.nominal) : "—"}
                </td>
                <td className="px-2 py-2 text-right font-semibold text-foreground">
                  {formatNumber(Math.round(row.mean))}
                </td>
                <td className="px-2 py-2 text-right text-foreground">
                  {formatNumber(Math.round(row.median))}
                </td>
                <td className="px-2 py-2 text-right text-foreground">
                  {row.nominal ? formatDiff(row.mean, row.nominal) : "—"}
                </td>
                <td className="px-2 py-2 text-right">
                  <span className="text-foreground">{row.samples}</span>
                  {lowData && <span className="block text-xs text-muted-foreground">pocos datos</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
