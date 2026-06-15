import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ chapter_stats: [], question_stats: [] })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ chapter_stats: [], question_stats: [] })
  }

  console.log('[report] userId:', userId)

  const [{ data: chapterStats, error: chapterErr }, { data: questionStats, error: questionErr }] = await Promise.all([
    supabaseAdmin
      .from('chapter_stats')
      // ── 2026-06-13 수정: order 기준 컬럼 updated_at select에 추가 ──
      .select('chapter_id, subject_id, avg_score, wrong_rate, total_attempts, last_attempt_at, lesson_completed, mini_quiz_correct, mini_quiz_total, lesson_completed_at, latest_score, best_score, test_attempts, total_questions, updated_at')
      // ── 기존 코드 (updated_at 누락) ──
      // .select('chapter_id, subject_id, avg_score, wrong_rate, total_attempts, last_attempt_at, lesson_completed, mini_quiz_correct, mini_quiz_total, lesson_completed_at, latest_score, best_score, test_attempts, total_questions')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(1000),
    supabaseAdmin
      .from('question_stats')
      .select('question_id, chapter_id, wrong_rate, total_attempts')
      .eq('user_id', userId)
      .order('wrong_rate', { ascending: false }),
  ])

  console.log('[report] chapterStats count:', chapterStats?.length, '| error:', chapterErr)
  console.log('[report] raw data:', JSON.stringify(chapterStats?.map(s => s.chapter_id)))
  console.log('[report] full data:', JSON.stringify(chapterStats))
  console.log('[report] questionStats count:', questionStats?.length, '| error:', questionErr)

  return NextResponse.json({
    chapter_stats:  chapterStats  ?? [],
    question_stats: questionStats ?? [],
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
