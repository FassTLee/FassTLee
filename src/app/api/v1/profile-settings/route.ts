import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  // ── 2026-06-16 수정: P0-1 인증 추가 — IDOR 보안 이슈 수정 ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
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
  // ── 2026-06-16 수정: P0-1 인증 추가 ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  const body = await req.json()
  const {
    exam_target_date, cert_type, region, daily_study_hours,
    daily_study_time, daily_study_count, study_time_slot,
    push_enabled, selected_subjects, code_popup_shown,
  } = body

  if (!userId || !isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      // exam_target_date는 명시적으로 null을 보내 초기화(D-Day 삭제)할 수 있어야 하므로
      // undefined(필드 미포함)일 때만 건드리지 않음 — null도 유효한 값으로 반영
      ...(exam_target_date !== undefined && { exam_target_date }),
      ...(cert_type           !== undefined && { cert_type }),
      ...(region              !== undefined && { region }),
      ...(daily_study_hours   !== undefined && { daily_study_hours }),
      ...(daily_study_time    !== undefined && { daily_study_time }),
      ...(daily_study_count   !== undefined && { daily_study_count }),
      ...(study_time_slot     !== undefined && { study_time_slot }),
      ...(push_enabled        !== undefined && { push_enabled }),
      ...(selected_subjects   !== undefined && { selected_subjects }),
      ...(code_popup_shown    !== undefined && { code_popup_shown }),
    })
    .eq('id', userId)

  if (error) {
    console.error('[profile-settings POST] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: true })
}
