import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUserId(token: any): string | null {
  return (token?.userId ?? token?.supabaseId ?? token?.sub) as string | null
}

function asMeta(meta: unknown): Record<string, unknown> {
  if (meta && typeof meta === 'object' && !Array.isArray(meta)) {
    return meta as Record<string, unknown>
  }
  return {}
}

export async function POST(req: NextRequest) {
  let body: { event_type?: unknown; meta?: unknown; guest_id?: unknown }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
  }

  const { event_type, meta, guest_id } = body

  if (typeof event_type !== 'string' || !event_type) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 })
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = getUserId(token)

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const mergedMeta = {
    ...asMeta(meta),
    ...(typeof guest_id === 'string' && guest_id ? { guest_id } : {}),
  }

  try {
    const { error } = await supabaseAdmin
      .from('user_events')
      .insert({
        user_id:    userId,
        event_type,
        meta:       mergedMeta,
      })

    if (error) {
      console.error('[event POST] user_events insert error:', error)
      return NextResponse.json({ ok: true, saved: false })
    }
  } catch (error) {
    console.error('[event POST] user_events insert exception:', error)
    return NextResponse.json({ ok: true, saved: false })
  }

  return NextResponse.json({ ok: true, saved: true })
}
