import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ chapter_stats: [], question_stats: [] })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', session.user.email)
    .single()

  if (!profile?.id) {
    return NextResponse.json({ chapter_stats: [], question_stats: [] })
  }

  const [{ data: chapterStats }, { data: questionStats }] = await Promise.all([
    supabase
      .from('chapter_stats')
      .select('chapter_id, subject_id, avg_score, wrong_rate, total_attempts, last_attempt_at')
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
