"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

interface Props {
  href?: string
}

export function BackButton({ href }: Props) {
  const router = useRouter()

  const handleClick = () => {
    if (href) {
      router.push(href)
    } else {
      router.back()
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="shrink-0"
      onClick={handleClick}
    >
      <ArrowLeft className="h-5 w-5" />
    </Button>
  )
}
