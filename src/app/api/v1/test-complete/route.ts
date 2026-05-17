import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface Record { questionId: string; correct: boolean }

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const session = await getServerSession(authOptions)
  const body = await req.json()
  const { chapterId, subjectId, records } = body as {
    chapterId: string; subjectId: string; records: Record[]; userId?: string
  }

  // 서버 session 우선, 없으면 클라이언트 userId fallback
  const userId = session?.user?.id ?? body.userId
  if (!chapterId || !userId || !Array.isArray(records)) {
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

  return NextResponse.json({ ok: true, saved: true })
}
