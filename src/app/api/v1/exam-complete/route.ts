import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const body = await req.json()
  const {
    subjects,
    totalScore,
    totalQuestions,
    passed,
    abandoned,
    timeRemaining,
    userId,
  } = body

  const { data, error } = await supabaseAdmin
    .from('exam_results')
    .insert({
      user_id:         userId ?? null,
      subjects,
      total_score:     totalScore,
      total_questions: totalQuestions,
      passed,
      abandoned,
      time_remaining:  timeRemaining,
      completed_at:    new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[exam-complete] error:', error)
    return NextResponse.json({ ok: true, saved: false })
  }

  return NextResponse.json({ ok: true, saved: true, examId: data?.id })
}
