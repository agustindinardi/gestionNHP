"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Printer } from "lucide-react"
import { saveScrollPosition } from "./scroll-restorer"

interface Props {
  printer: {
    id: string
    name: string
    counter: number | null
    color: string | null
  }
}

export function PrinterCard({ printer }: Props) {
  return (
    <Link 
      href={`/dashboard/printers/${printer.id}`}
      onClick={saveScrollPosition}
    >
      <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div
            className="p-2 rounded-lg w-fit"
            style={{ backgroundColor: printer.color || "#3b82f6" }}
          >
            <Printer className="h-5 w-5 text-white" />
          </div>
          <CardTitle className="mt-3">{printer.name}</CardTitle>
          <CardDescription>
            Contador actual: {printer.counter?.toLocaleString("es-AR") ?? 0} copias
          </CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}
