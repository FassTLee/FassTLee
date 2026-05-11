import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const body = await req.json()
  const { chapterId, subjectId, miniQuizCorrect, miniQuizTotal, userId } = body as {
    chapterId: string; subjectId: string; miniQuizCorrect: number; miniQuizTotal: number; userId: string
  }
  if (!chapterId || !userId) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('sub', userId).single()
  if (!profile?.id) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const now = new Date().toISOString()

  const { data: existing } = await supabase
    .from('chapter_stats')
    .select('id')
    .eq('user_id', profile.id)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('chapter_stats')
      .update({
        lesson_completed:     true,
        mini_quiz_correct:    miniQuizCorrect ?? 0,
        mini_quiz_total:      miniQuizTotal   ?? 0,
        lesson_completed_at:  now,
        updated_at:           now,
      })
      .eq('user_id', profile.id)
      .eq('chapter_id', chapterId)
  } else {
    await supabase.from('chapter_stats').insert({
      user_id:             profile.id,
      chapter_id:          chapterId,
      subject_id:          subjectId ?? '',
      total_attempts:      0,
      total_correct:       0,
      avg_score:           0,
      wrong_rate:          0,
      lesson_completed:    true,
      mini_quiz_correct:   miniQuizCorrect ?? 0,
      mini_quiz_total:     miniQuizTotal   ?? 0,
      lesson_completed_at: now,
      last_attempt_at:     now,
      updated_at:          now,
    })
  }

  return NextResponse.json({ ok: true, saved: true })
}
