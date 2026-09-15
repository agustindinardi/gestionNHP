import { updateSession } from '@/lib/supabase/proxy'
import { type NextRequest, NextResponse } from 'next/server'

// Rate limiting: 500 solicitudes por 15 minutos por IP
const RATE_LIMIT_REQUESTS = 500
const RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutos en ms

// Mapa para rastrear solicitudes por IP.
// NOTA: es estado en memoria del proceso. En un deploy serverless (p. ej. Vercel)
// no se comparte entre instancias, así que el rate limit es aproximado por instancia.
// Para un límite global y persistente habría que usar un store con TTL (Upstash
// Redis / @vercel/kv). Para este caso alcanza; lo único que arreglamos acá es que
// el Map no crezca indefinidamente.
const requestCounts = new Map<string, { count: number; resetTime: number }>()

// Última vez que barrimos entradas vencidas. Sin esto, cada IP nueva dejaba una
// clave que nunca se eliminaba (fuga de memoria lenta).
let lastCleanup = Date.now()

function cleanupExpired(now: number): void {
  // Barremos como mucho una vez por ventana para no pagar O(n) en cada request.
  if (now - lastCleanup < RATE_LIMIT_WINDOW) return
  lastCleanup = now
  for (const [ip, record] of requestCounts) {
    if (now > record.resetTime) {
      requestCounts.delete(ip)
    }
  }
}

function getClientIP(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  cleanupExpired(now)
  const record = requestCounts.get(ip)

  if (!record || now > record.resetTime) {
    // Nueva ventana o primer acceso
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_REQUESTS) {
    return false
  }

  record.count++
  return true
}

export async function middleware(request: NextRequest) {
  // Saltar rate limiting para recursos estáticos
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/favicon')
  ) {
    return await updateSession(request)
  }

  // Aplicar rate limiting
  const ip = getClientIP(request)
  if (!checkRateLimit(ip)) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
