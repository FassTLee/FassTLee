import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  if (!isSupabaseConfigured) {
    return NextResponse.json({ chapter_stats: [], question_stats: [] })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (!profile?.id) {
    return NextResponse.json({ chapter_stats: [], question_stats: [] })
  }

  const [{ data: chapterStats }, { data: questionStats }] = await Promise.all([
    supabase
      .from('chapter_stats')
      .select('chapter_id, subject_id, avg_score, wrong_rate, total_attempts, last_attempt_at, lesson_completed, mini_quiz_correct, mini_quiz_total, lesson_completed_at')
      .eq('user_id', profile.id)
      .order('last_attempt_at', { ascending: false }),
    supabase
      .from('question_stats')
      .select('question_id, chapter_id, wrong_rate, total_attempts')
      .eq('user_id', profile.id)
      .order('wrong_rate', { ascending: false }),
  ])

  return NextResponse.json({
    chapter_stats:  chapterStats  ?? [],
    question_stats: questionStats ?? [],
  })
}
