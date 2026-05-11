import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const body = await req.json()
  const { chapterId, subjectId, miniQuizCorrect, miniQuizTotal, userId } = body as {
    chapterId: string; subjectId: string; miniQuizCorrect: number; miniQuizTotal: number; userId: string
  }
  if (!chapterId || !userId) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const now = new Date().toISOString()

  const { data: existing } = await supabaseAdmin
    .from('chapter_stats')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  console.log('[lesson-complete] userId:', userId, '| chapterId:', chapterId, '| existing:', !!existing)

  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('chapter_stats')
      .update({
        lesson_completed:    true,
        mini_quiz_correct:   miniQuizCorrect ?? 0,
        mini_quiz_total:     miniQuizTotal   ?? 0,
        lesson_completed_at: now,
        updated_at:          now,
      })
      .eq('user_id', userId)
      .eq('chapter_id', chapterId)
      .select()
    console.log('[lesson-complete] UPDATE data:', data, '| error:', error)
  } else {
    try {
      const { data, error } = await supabaseAdmin.from('chapter_stats').insert({
        user_id:             userId,
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
      }).select()
      console.log('[lesson-complete] INSERT data:', data, '| error:', error)
    } catch (e) {
      console.log('[lesson-complete] INSERT EXCEPTION:', e)
    }
  }

  return NextResponse.json({ ok: true, saved: true })
}
