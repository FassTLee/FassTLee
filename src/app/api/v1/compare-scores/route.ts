import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ================================================================
// GET /api/v1/compare-scores?my_guest_id=...&ref_guest_id=...
// → 두 guest_test_results 조회 후 점수 비교 데이터 반환
// ================================================================

function getLevelLabel(percentage: number): string {
  if (percentage === 100) return '마스터 트레이너'
  if (percentage >= 80) return '기능해부학 탐험가'
  if (percentage >= 60) return '해부학 입문+'
  if (percentage >= 40) return '해부학 입문'
  return '기초 탐험 중'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const myGuestId = searchParams.get('my_guest_id')
  const refGuestId = searchParams.get('ref_guest_id')

  if (!myGuestId || !refGuestId) {
    return NextResponse.json(
      { error: 'my_guest_id and ref_guest_id required' },
      { status: 400 }
    )
  }

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: false, reason: 'supabase_not_configured' })
  }

  try {
    const [myRes, refRes] = await Promise.all([
      supabase
        .from('guest_test_results')
        .select('score, total_questions')
        .eq('guest_id', myGuestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('guest_test_results')
        .select('score, total_questions')
        .eq('guest_id', refGuestId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),
    ])

    if (!myRes.data || !refRes.data) {
      return NextResponse.json({ ok: false, reason: 'result_not_found' })
    }

    const myScore = myRes.data.score ?? 0
    const myTotal = myRes.data.total_questions ?? 5
    const refScore = refRes.data.score ?? 0
    const refTotal = refRes.data.total_questions ?? 5
    const myPct = Math.round((myScore / myTotal) * 100)
    const refPct = Math.round((refScore / refTotal) * 100)

    return NextResponse.json({
      ok: true,
      my: { score: myScore, total: myTotal, percentage: myPct, level: getLevelLabel(myPct) },
      ref: { score: refScore, total: refTotal, percentage: refPct, level: getLevelLabel(refPct) },
      winner: myScore > refScore ? 'me' : myScore < refScore ? 'friend' : 'tie',
    })
  } catch (err) {
    console.error('[CompareScores] Error:', err)
    return NextResponse.json({ ok: false, reason: 'server_error' })
  }
}
