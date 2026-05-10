import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const body = await req.json()
  const { chapterId, subjectId, miniQuizCorrect, miniQuizTotal } = body as {
    chapterId: string; subjectId: string; miniQuizCorrect: number; miniQuizTotal: number
  }
  if (!chapterId) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('email', email).single()
  if (!profile?.id) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const now = new Date().toISOString()

  // 기존 레코드 확인 후 lesson 관련 필드만 선택적으로 업데이트
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
