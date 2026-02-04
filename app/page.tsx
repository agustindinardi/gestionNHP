import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = await createClient()
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      redirect("/auth/login")
    }
    
    redirect("/dashboard")
  } catch {
    redirect("/auth/login")
  }
}
