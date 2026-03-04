"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const SCROLL_KEY = "printers-list-scroll"

export function PrintersScrollRestorer() {
  const pathname = usePathname()

  useEffect(() => {
    // Solo restaurar scroll en la página de lista de impresoras
    if (pathname === "/dashboard/printers") {
      const savedScroll = sessionStorage.getItem(SCROLL_KEY)
      if (savedScroll) {
        // Pequeño delay para asegurar que el contenido esté renderizado
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScroll, 10))
          sessionStorage.removeItem(SCROLL_KEY)
        }, 50)
      }
    }
  }, [pathname])

  return null
}

export function saveScrollPosition() {
  sessionStorage.setItem(SCROLL_KEY, window.scrollY.toString())
}
