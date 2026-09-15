import React from "react"
import { Sidebar } from "@/components/dashboard/sidebar"

// El gating de autenticación lo hace el middleware (proxy.ts): redirige a
// /auth/login cuando no hay usuario antes de que este layout se renderice.
// No repetimos aquí supabase.auth.getUser() porque es una llamada de red al
// servidor Auth de Supabase y duplicarla suma un round-trip completo (~150-300ms)
// en cada navegación del dashboard. RLS sigue protegiendo los datos a nivel DB.
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="p-4 lg:p-8 pt-4 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}
