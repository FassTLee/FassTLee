import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ exam_target_date: null, region: null, daily_study_hours: null })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ exam_target_date: null, region: null, daily_study_hours: null })
  }

  const { data } = await supabase
    .from('profiles')
    .select('exam_target_date, region, daily_study_hours')
    .eq('sub', userId)
    .single()

  return NextResponse.json({
    exam_target_date:  data?.exam_target_date  ?? null,
    region:            data?.region            ?? null,
    daily_study_hours: data?.daily_study_hours ?? null,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, exam_target_date, region, daily_study_hours } = body
  if (!userId) return NextResponse.json({ ok: true, saved: false })
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })

  // sub 기준 upsert
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('sub', userId)
    .maybeSingle()

  if (existing?.id) {
    await supabase
      .from('profiles')
      .update({
        exam_target_date:  exam_target_date  ?? null,
        region:            region            ?? null,
        daily_study_hours: daily_study_hours ?? null,
      })
      .eq('id', existing.id)
  } else {
    await supabase.from('profiles').insert({
      sub:              userId,
      exam_target_date: exam_target_date  ?? null,
      region:           region            ?? null,
      daily_study_hours: daily_study_hours ?? null,
    })
  }

  return NextResponse.json({ ok: true, saved: true })
}
