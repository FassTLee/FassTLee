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
  const { chapterId, subjectId, miniQuizCorrect, miniQuizTotal, certId } = body as {
    chapterId: string; subjectId: string; miniQuizCorrect: number; miniQuizTotal: number; userId?: string; certId?: string | null
  }

  // 서버 session 우선, 없으면 클라이언트 userId fallback
  const userId = session?.user?.id ?? body.userId
  if (!chapterId || !userId) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const now = new Date().toISOString()

  // certId가 있으면 그 자격증 문맥의 행만, 없으면 certification_id가 NULL인 행만 조회
  // (같은 chapter_id를 여러 자격증이 공유하는 경우 진도를 분리 추적하기 위함)
  let existingQuery = supabaseAdmin
    .from('chapter_stats')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
  existingQuery = certId ? existingQuery.eq('certification_id', certId) : existingQuery.is('certification_id', null)
  const { data: existing } = await existingQuery.maybeSingle()

  console.log('[lesson-complete] userId:', userId, '| chapterId:', chapterId, '| certId:', certId, '| existing:', !!existing)

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
      .eq('id', existing.id)
      .select()
    console.log('[lesson-complete] UPDATE data:', data, '| error:', error)
  } else {
    try {
      const { data, error } = await supabaseAdmin.from('chapter_stats').insert({
        user_id:             userId,
        chapter_id:          chapterId,
        subject_id:          subjectId ?? '',
        certification_id:    certId ?? null,
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
