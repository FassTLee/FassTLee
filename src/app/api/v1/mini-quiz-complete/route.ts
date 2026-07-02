import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const session = await getServerSession(authOptions)
  const body = await req.json()
  const { chapterId, subjectId, questionId, correct, certId } = body as {
    chapterId:  string
    subjectId:  string
    questionId: string
    correct:    boolean
    userId?:    string
    certId?:    string | null
  }

  // 서버 session 우선, 없으면 클라이언트 userId fallback
  const userId = session?.user?.id ?? body.userId
  if (!chapterId || !userId || !questionId) {
    return NextResponse.json({ ok: true, saved: false })
  }

  // ── 1. chapter_stats: mini_quiz_correct / mini_quiz_total 업데이트 ────
  // certId가 있으면 그 자격증 문맥의 행만, 없으면 certification_id가 NULL인 행만 조회
  let existingQuery = supabaseAdmin
    .from('chapter_stats')
    .select('id, mini_quiz_correct, mini_quiz_total')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
  existingQuery = certId ? existingQuery.eq('certification_id', certId) : existingQuery.is('certification_id', null)
  const { data: existing } = await existingQuery.maybeSingle()

  const oldCorrect = existing?.mini_quiz_correct ?? 0
  const oldTotal   = existing?.mini_quiz_total   ?? 0

  if (existing) {
    await supabaseAdmin.from('chapter_stats').update({
      mini_quiz_correct: oldCorrect + (correct ? 1 : 0),
      mini_quiz_total:   oldTotal + 1,
    }).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('chapter_stats').insert({
      user_id:           userId,
      chapter_id:        chapterId,
      subject_id:        subjectId ?? '',
      certification_id:  certId ?? null,
      mini_quiz_correct: oldCorrect + (correct ? 1 : 0),
      mini_quiz_total:   oldTotal + 1,
    })
  }

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
