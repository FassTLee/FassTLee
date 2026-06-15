import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUserId(token: any): string | null {
  return (token?.userId ?? token?.supabaseId ?? token?.sub) as string | null
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = getUserId(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ learning_style: null, style_tested_at: null })
  }
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('learning_style, style_tested_at')
    .eq('id', userId)
    .single()
  return NextResponse.json({
    learning_style:  data?.learning_style  ?? null,
    style_tested_at: data?.style_tested_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const userId = getUserId(token)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { learning_style, learning_style_answers } = await req.json()
  if (learning_style !== 'memorizer' && learning_style !== 'conceptualizer') {
    return NextResponse.json({ error: 'Invalid learning_style' }, { status: 400 })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({
      learning_style,
      style_tested_at:      new Date().toISOString(),
      onboarding_completed: true,
      ...(learning_style_answers ? { learning_style_answers } : {}),
    })
    .eq('id', userId)
    .select('id')

  if (error) console.error('[learning-style POST] error:', error)

  const saved = !error && (data?.length ?? 0) > 0
  if (!saved && !error) console.warn('[learning-style POST] 0 rows updated — userId:', userId)

  return NextResponse.json({ ok: true, saved })
}
