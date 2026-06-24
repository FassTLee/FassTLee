import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface Record { questionId: string; correct: boolean; selected?: number; answer_index?: number[] }

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const session = await getServerSession(authOptions)
  const body = await req.json()
  const { chapterId, subjectId, records } = body as {
    chapterId: string; subjectId: string; records: Record[]; userId?: string
  }

  // ── 기존 코드 (body.userId fallback → IDOR 취약점) ──
  // const userId = session?.user?.id ?? body.userId
  // ── 2026-06-16 수정: P0-3 session만 신뢰, 비로그인 시 skip ──
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ ok: true, saved: false })
  if (!chapterId || !Array.isArray(records)) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const total        = records.length
  const correctCount = records.filter((r) => r.correct).length
  const score        = total > 0 ? Math.round((correctCount / total) * 100) : 0

  const { data: existing } = await supabaseAdmin
    .from('chapter_stats')
    .select('total_attempts, total_correct, avg_score, best_score, test_attempts')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  const oldAttempts     = existing?.total_attempts  ?? 0
  const oldCorrect      = existing?.total_correct   ?? 0
  const oldAvg          = existing?.avg_score       ?? 0
  const oldBestScore    = existing?.best_score      ?? 0
  const oldTestAttempts = existing?.test_attempts   ?? 0

  const newAttempts     = oldAttempts + 1
  const newCorrect      = oldCorrect + correctCount
  const newAvg          = Math.round((oldAvg * oldAttempts + score) / newAttempts)
  const newWrongRate    = newAttempts > 0
    ? Math.round(((newAttempts * total - newCorrect) / (newAttempts * total)) * 100)
    : 0
  const newTestAttempts = oldTestAttempts + 1
  const newBestScore    = Math.max(score, oldBestScore)

  await supabaseAdmin.from('chapter_stats').upsert(
    {
      user_id:         userId,
      chapter_id:      chapterId,
      subject_id:      subjectId ?? '',
      total_attempts:  newAttempts,
      total_correct:   newCorrect,
      avg_score:       newAvg,
      wrong_rate:      newWrongRate,
      latest_score:    score,
      best_score:      newBestScore,
      test_attempts:   newTestAttempts,
      total_questions: total,
      last_attempt_at: new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    },
    { onConflict: 'user_id,chapter_id' }
  )

  await supabaseAdmin.from('chapter_test_history').insert({
    user_id:        userId,
    chapter_id:     chapterId,
    score:          score,
    attempt_number: newTestAttempts,
  })

  await Promise.all(
    records.map(async (r) => {
      const { data: existingQ } = await supabaseAdmin
        .from('question_stats')
        .select('total_attempts, total_correct')
        .eq('user_id', userId)
        .eq('question_id', String(r.questionId))
        .maybeSingle()

      const qOld      = existingQ?.total_attempts ?? 0
      const qOldRight = existingQ?.total_correct  ?? 0
      const qAttempts = qOld + 1
      const qCorrect  = qOldRight + (r.correct ? 1 : 0)
      const qWrongRate = Math.round(((qAttempts - qCorrect) / qAttempts) * 100)

      await supabaseAdmin.from('question_stats').upsert(
        {
          user_id:        userId,
          question_id:    String(r.questionId),
          chapter_id:     chapterId,
          total_attempts: qAttempts,
          total_correct:  qCorrect,
          wrong_rate:     qWrongRate,
          updated_at:     new Date().toISOString(),
        },
        { onConflict: 'user_id,question_id' }
      )
    })
  )

  // ── wrong_answers insert (오답 레코드만) ──────────────────────────
  const wrongRecords = records.filter((r) => !r.correct)
  if (wrongRecords.length > 0) {
    await supabaseAdmin.from('wrong_answers').insert(
      wrongRecords.map((r) => ({
        user_id:         userId,
        chapter_id:      chapterId,
        question_id:     String(r.questionId),
        selected_option: String(r.selected    ?? ''),
        correct_option:  String(r.answer_index?.[0] ?? ''),
      }))
    )
  }

  return NextResponse.json({ ok: true, saved: true })
}
