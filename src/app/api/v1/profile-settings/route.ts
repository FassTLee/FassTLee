import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ exam_target_date: null, region: null, daily_study_hours: null })
  }
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
  const body = await req.json()
  const { email, exam_target_date, region, daily_study_hours } = body
  if (!email) return NextResponse.json({ ok: true, saved: false })
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })

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
