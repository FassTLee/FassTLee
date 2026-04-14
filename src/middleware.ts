import { NextRequest, NextResponse } from 'next/server'

// ─── Rate Limiting (In-memory, Edge compatible) ──────────────────
// Production: Redis 기반으로 교체 권장

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

// ─── Security Headers ────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.supabase.co",
      "connect-src 'self' https://*.supabase.co https://accounts.google.com",
      "frame-src https://accounts.google.com",
    ].join('; ')
  )
  // HSTS
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  // Permissions
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return response
}

// ─── Main Middleware ─────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? 'unknown'

  // ── API Rate Limiting ──────────────────────────────────────────

  if (pathname.startsWith('/api/')) {
    let limit = 60
    const windowMs = 60_000  // 1분

    if (pathname.startsWith('/api/test') || pathname.startsWith('/api/landing')) {
      limit = 10
    }

    const key = `api:${ip}:${pathname.split('/').slice(0, 3).join('/')}`
    const { allowed, remaining } = checkRateLimit(key, limit, windowMs)

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests', retryAfter: 60 }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const response = NextResponse.next()
    response.headers.set('X-RateLimit-Limit', String(limit))
    response.headers.set('X-RateLimit-Remaining', String(remaining))
    return addSecurityHeaders(response)
  }

  // ── Landing test IP 일 3회 제한 ────────────────────────────────
  if (pathname === '/landing/test') {
    const key = `landing-test:${ip}:${new Date().toISOString().slice(0, 10)}`
    const { allowed } = checkRateLimit(key, 3, 24 * 60 * 60_000)

    if (!allowed) {
      const response = NextResponse.redirect(new URL('/landing?rate_limited=1', request.url))
      return addSecurityHeaders(response)
    }
  }

  // ── CORS for API ───────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    const origin = request.headers.get('origin') ?? ''
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
      'https://fitdoor.com',
      'https://www.fitdoor.com',
    ]

    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
  }

  const response = NextResponse.next()
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
}
