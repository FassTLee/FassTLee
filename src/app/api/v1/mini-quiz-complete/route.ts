import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const body = await req.json()
  const { chapterId, subjectId, questionId, correct, userId } = body as {
    chapterId:  string
    subjectId:  string
    questionId: string
    correct:    boolean
    userId:     string
  }

  if (!chapterId || !userId || !questionId) {
    return NextResponse.json({ ok: true, saved: false })
  }

  // ── 1. chapter_stats: mini_quiz_correct / mini_quiz_total 업데이트 ────
  const { data: existing } = await supabaseAdmin
    .from('chapter_stats')
    .select('mini_quiz_correct, mini_quiz_total')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  const oldCorrect = existing?.mini_quiz_correct ?? 0
  const oldTotal   = existing?.mini_quiz_total   ?? 0

  await supabaseAdmin.from('chapter_stats').upsert(
    {
      user_id:           userId,
      chapter_id:        chapterId,
      subject_id:        subjectId ?? '',
      mini_quiz_correct: oldCorrect + (correct ? 1 : 0),
      mini_quiz_total:   oldTotal + 1,
    },
    { onConflict: 'user_id,chapter_id' }
  )

  // ── 2. question_stats: 문제별 정답률 업데이트 ──────────────────────────
  const { data: existingQ } = await supabaseAdmin
    .from('question_stats')
    .select('total_attempts, total_correct')
    .eq('user_id', userId)
    .eq('question_id', String(questionId))
    .maybeSingle()

  const qOldAttempts = existingQ?.total_attempts ?? 0
  const qOldCorrect  = existingQ?.total_correct  ?? 0
  const qAttempts    = qOldAttempts + 1
  const qCorrect     = qOldCorrect + (correct ? 1 : 0)
  const qWrongRate   = Math.round(((qAttempts - qCorrect) / qAttempts) * 100)

  await supabaseAdmin.from('question_stats').upsert(
    {
      user_id:        userId,
      question_id:    String(questionId),
      chapter_id:     chapterId,
      total_attempts: qAttempts,
      total_correct:  qCorrect,
      wrong_rate:     qWrongRate,
      updated_at:     new Date().toISOString(),
    },
    { onConflict: 'user_id,question_id' }
  )

  return NextResponse.json({ ok: true, saved: true })
}
