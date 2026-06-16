import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  // ── 2026-06-16 수정: P0-1 인증 추가 — IDOR 타인 데이터 조회 가능 보안 이슈 수정 ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  // ── 기존 코드 (쿼리 파라미터 userId → session userId로 대체) ──
  // const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ chapter_stats: [], question_stats: [] })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ chapter_stats: [], question_stats: [] })
  }

  const [{ data: chapterStats }, { data: questionStats }] = await Promise.all([
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

  return NextResponse.json({
    chapter_stats:  chapterStats  ?? [],
    question_stats: questionStats ?? [],
  }, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
