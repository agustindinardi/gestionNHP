import Link from "next/link"
import { formatNumber } from "@/lib/format-date"
import type { RankedItem } from "@/lib/metrics"

interface Props {
  items: RankedItem[]
  emptyText: string
  hrefFor?: (item: RankedItem) => string
}

// Ranking horizontal: etiqueta arriba, barra debajo anclada a la izquierda con
// el extremo de dato redondeado. El valor va en texto, así la lista se lee como
// una tabla aunque no se distinga el color.
export function BarList({ items, emptyText, hrefFor }: Props) {
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
  }

  const max = Math.max(...items.map((item) => item.value), 1)

  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const width = item.value === 0 ? 0 : Math.max((item.value / max) * 100, 2)
        const content = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                <span className="font-medium text-foreground">{item.label}</span>
                {item.sublabel && (
                  <span className="text-muted-foreground"> · {item.sublabel}</span>
                )}
              </span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">
                {formatNumber(item.value)}
              </span>
            </div>
            <div className="mt-1.5 h-2.5 w-full">
              <div
                className="h-full rounded-r-[4px] transition-opacity group-hover:opacity-80"
                style={{ width: `${width}%`, backgroundColor: "var(--viz-series)" }}
              />
            </div>
          </>
        )

        const rowClass = "group block rounded-md px-2 py-2 transition-colors hover:bg-muted/60"

        return (
          <li key={item.id} title={item.title}>
            {hrefFor ? (
              <Link href={hrefFor(item)} className={rowClass}>
                {content}
              </Link>
            ) : (
              <div className={rowClass}>{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
