import React from "react"
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NHP - Gestión de Impresoras',
  description: 'Sistema de gestión de impresoras y repuestos',
  icons: {
    icon: '/Adobe Express - file.png',
    apple: '/Adobe Express - file.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
