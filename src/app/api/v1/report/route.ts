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
      .select('chapter_id, subject_id, avg_score, wrong_rate, total_attempts, last_attempt_at, lesson_completed, mini_quiz_correct, mini_quiz_total, lesson_completed_at')
      .eq('user_id', userId)
      .order('last_attempt_at', { ascending: false }),
    supabaseAdmin
      .from('question_stats')
      .select('question_id, chapter_id, wrong_rate, total_attempts')
      .eq('user_id', userId)
      .order('wrong_rate', { ascending: false }),
  ])

  console.log('[report] chapterStats count:', chapterStats?.length, '| error:', chapterErr)
  console.log('[report] questionStats count:', questionStats?.length, '| error:', questionErr)

  return NextResponse.json({
    chapter_stats:  chapterStats  ?? [],
    question_stats: questionStats ?? [],
  })
}
