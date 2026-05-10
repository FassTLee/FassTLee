import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

interface Record { questionId: string; correct: boolean }

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const body = await req.json()
  const { chapterId, subjectId, records, email } = body as {
    chapterId: string; subjectId: string; records: Record[]; email: string
  }
  if (!chapterId || !email || !Array.isArray(records)) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile?.id) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const userId = profile.id
  const total = records.length
  const correctCount = records.filter((r) => r.correct).length
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0

  const { data: existing } = await supabase
    .from('chapter_stats')
    .select('total_attempts, total_correct, avg_score')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  const oldAttempts = existing?.total_attempts ?? 0
  const oldCorrect  = existing?.total_correct  ?? 0
  const oldAvg      = existing?.avg_score      ?? 0
  const newAttempts = oldAttempts + 1
  const newCorrect  = oldCorrect + correctCount
  const newAvg      = Math.round((oldAvg * oldAttempts + score) / newAttempts)
  const newWrongRate = newAttempts > 0
    ? Math.round(((newAttempts * total - newCorrect) / (newAttempts * total)) * 100)
    : 0

  await supabase.from('chapter_stats').upsert(
    {
      user_id:         userId,
      chapter_id:      chapterId,
      subject_id:      subjectId ?? '',
      total_attempts:  newAttempts,
      total_correct:   newCorrect,
      avg_score:       newAvg,
      wrong_rate:      newWrongRate,
      last_attempt_at: new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    },
    { onConflict: 'user_id,chapter_id' }
  )

  await Promise.all(
    records.map(async (r) => {
      const { data: existingQ } = await supabase
        .from('question_stats')
        .select('total_attempts, total_correct')
        .eq('user_id', userId)
        .eq('question_id', String(r.questionId))
        .maybeSingle()

      const qOldAttempts = existingQ?.total_attempts ?? 0
      const qOldCorrect  = existingQ?.total_correct  ?? 0
      const qAttempts = qOldAttempts + 1
      const qCorrect  = qOldCorrect + (r.correct ? 1 : 0)
      const qWrongRate = Math.round(((qAttempts - qCorrect) / qAttempts) * 100)

      await supabase.from('question_stats').upsert(
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
