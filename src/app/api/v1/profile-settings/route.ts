import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId || !isSupabaseAdminConfigured) {
    return NextResponse.json({
      exam_target_date: null, cert_type: null, region: null,
      daily_study_hours: null, daily_study_time: null,
      daily_study_count: null, study_time_slot: null,
      push_enabled: false, selected_subjects: null,
    })
  }

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('exam_target_date, cert_type, region, daily_study_hours, daily_study_time, daily_study_count, study_time_slot, push_enabled, selected_subjects')
    .eq('id', userId)
    .single()

  return NextResponse.json({
    exam_target_date:   data?.exam_target_date   ?? null,
    cert_type:          data?.cert_type          ?? null,
    region:             data?.region             ?? null,
    daily_study_hours:  data?.daily_study_hours  ?? null,
    daily_study_time:   data?.daily_study_time   ?? null,
    daily_study_count:  data?.daily_study_count  ?? null,
    study_time_slot:    data?.study_time_slot    ?? null,
    push_enabled:       data?.push_enabled       ?? false,
    selected_subjects:  data?.selected_subjects  ?? null,
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    userId,
    exam_target_date, cert_type, region, daily_study_hours,
    daily_study_time, daily_study_count, study_time_slot,
    push_enabled, selected_subjects,
  } = body

  if (!userId || !isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      ...(exam_target_date !== undefined && exam_target_date !== null && { exam_target_date }),
      ...(cert_type           !== undefined && { cert_type }),
      ...(region              !== undefined && { region }),
      ...(daily_study_hours   !== undefined && { daily_study_hours }),
      ...(daily_study_time    !== undefined && { daily_study_time }),
      ...(daily_study_count   !== undefined && { daily_study_count }),
      ...(study_time_slot     !== undefined && { study_time_slot }),
      ...(push_enabled        !== undefined && { push_enabled }),
      ...(selected_subjects   !== undefined && { selected_subjects }),
    })
    .eq('id', userId)

  if (error) {
    console.error('[profile-settings POST] error:', error)
    return NextResponse.json({ ok: true, saved: false })
  }

  return NextResponse.json({ ok: true, saved: true })
}
