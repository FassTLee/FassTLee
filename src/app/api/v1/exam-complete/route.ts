import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  // ── 2026-06-16 수정: P0-4 인증 추가 — 인증 없이 결과 조작 가능 보안 이슈 수정 ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const {
    subjects,
    totalScore,
    totalQuestions,
    passed,
    abandoned,
    timeRemaining,
  } = body

  const { data, error } = await supabaseAdmin
    .from('exam_results')
    .insert({
      // ── 기존 코드 (body userId → session userId로 대체) ──
      // user_id: userId ?? null,
      user_id:         session.user.id,
      subjects,
      total_score:     totalScore,
      total_questions: totalQuestions,
      passed,
      abandoned,
      time_remaining:  timeRemaining,
      completed_at:    new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[exam-complete] error:', error)
    return NextResponse.json({ ok: true, saved: false })
  }

  return NextResponse.json({ ok: true, saved: true, examId: data?.id })
}
