import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ================================================================
// POST /api/auth/convert-guest — 비회원 테스트 결과 → 회원 계정 이전
// Body: { guest_id: string }
// ================================================================

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { guest_id } = await req.json()
  if (!guest_id) {
    return NextResponse.json({ error: 'guest_id required' }, { status: 400 })
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, converted: false })
  }

  try {
    // 1. 미전환 게스트 결과 조회
    const { data: guestResults, error: fetchError } = await supabase
      .from('guest_test_results')
      .select('*')
      .eq('guest_id', guest_id)
      .eq('is_converted', false)

    if (fetchError) throw fetchError
    if (!guestResults || guestResults.length === 0) {
      return NextResponse.json({ ok: true, converted: false, message: 'No results to convert' })
    }

    // 2. 사용자 프로필 조회 (email → user id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', session.user.email)
      .single()

    if (!profile) {
      return NextResponse.json({ ok: true, converted: false, message: 'Profile not found' })
    }

    // 3. test_results로 이전
    await supabase.from('test_results').insert(
      guestResults.map((gr) => ({
        user_id: profile.id,
        chapter: 'landing_test',
        score: gr.score ?? 0,
        total: gr.total_questions ?? 5,
        type_scores_json: { answers: gr.answers_json },
        weak_muscles: [],
      }))
    )

    // 4. is_converted 업데이트
    await supabase
      .from('guest_test_results')
      .update({ is_converted: true })
      .eq('guest_id', guest_id)

    return NextResponse.json({ ok: true, converted: true, count: guestResults.length })
  } catch (err) {
    console.error('[ConvertGuest] Error:', err)
    return NextResponse.json({ error: 'Conversion failed' }, { status: 500 })
  }
}
