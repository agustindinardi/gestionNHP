"use client"

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatNumber } from "@/lib/format-date"
import type { MonthlyPoint } from "@/lib/metrics"

interface TooltipProps {
  active?: boolean
  payload?: { payload: MonthlyPoint }[]
}

function MonthTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground">{point.fullLabel}</p>
      <p className="font-semibold text-foreground">
        {formatNumber(point.quantity)} repuesto{point.quantity === 1 ? "" : "s"}
      </p>
    </div>
  )
}

export function MonthlyChangesChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="space-y-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -20 }}>
            <CartesianGrid vertical={false} stroke="var(--viz-grid)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: "var(--viz-axis)" }}
              tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={8}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--viz-muted)", fontSize: 12 }}
              width={44}
            />
            <Tooltip cursor={{ fill: "var(--viz-cursor)" }} content={<MonthTooltip />} />
            <Bar
              dataKey="quantity"
              fill="var(--viz-series)"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
          Ver datos en tabla
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-1.5 font-medium">Mes</th>
                <th className="py-1.5 text-right font-medium">Repuestos</th>
              </tr>
            </thead>
            <tbody>
              {data.map((point) => (
                <tr key={point.key} className="border-b border-border/60">
                  <td className="py-1.5">{point.fullLabel}</td>
                  <td className="py-1.5 text-right tabular-nums">{formatNumber(point.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
