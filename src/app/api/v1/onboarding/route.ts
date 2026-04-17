import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// ================================================================
// POST /api/v1/onboarding — 온보딩 서베이 결과 저장
// ================================================================

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { gender, age_group, occupation } = await req.json()

  // Supabase 미설정 시 200으로 응답 (localStorage가 주 저장소)
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  try {
    await supabase
      .from('profiles')
      .update({
        gender,
        age_group,
        occupation,
        onboarding_completed: true,
      })
      .eq('email', session.user.email)

    return NextResponse.json({ ok: true, saved: true })
  } catch (err) {
    console.error('[Onboarding] Save error:', err)
    // 저장 실패해도 클라이언트는 계속 진행
    return NextResponse.json({ ok: true, saved: false })
  }
}
