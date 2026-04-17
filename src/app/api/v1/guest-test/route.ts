import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ================================================================
// POST /api/v1/guest-test — 비회원 테스트 결과 저장
// ================================================================

export async function POST(req: NextRequest) {
  const { guest_id, score, total_questions, correct_answers, level_result, answers_json } =
    await req.json()

  if (!guest_id) {
    return NextResponse.json({ error: 'guest_id required' }, { status: 400 })
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  try {
    const { data, error } = await supabase
      .from('guest_test_results')
      .insert({
        guest_id,
        score,
        total_questions,
        correct_answers,
        level_result,
        answers_json,
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, saved: true, id: data?.id })
  } catch (err) {
    console.error('[GuestTest] Save error:', err)
    return NextResponse.json({ ok: true, saved: false })
  }
}
