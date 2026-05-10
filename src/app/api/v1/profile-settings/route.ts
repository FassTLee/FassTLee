import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  if (!isSupabaseConfigured) {
    return NextResponse.json({ exam_target_date: null, region: null, daily_study_hours: null })
  }

  const { data } = await supabase
    .from('profiles')
    .select('exam_target_date, region, daily_study_hours')
    .eq('email', email)
    .single()

  return NextResponse.json({
    exam_target_date:  data?.exam_target_date  ?? null,
    region:            data?.region            ?? null,
    daily_study_hours: data?.daily_study_hours ?? null,
  })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })

  const body = await req.json()
  const { exam_target_date, region, daily_study_hours } = body

  await supabase.from('profiles').upsert(
    {
      email,
      exam_target_date:  exam_target_date  ?? null,
      region:            region            ?? null,
      daily_study_hours: daily_study_hours ?? null,
    },
    { onConflict: 'email' }
  )

  return NextResponse.json({ ok: true, saved: true })
}
