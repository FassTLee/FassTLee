// /api/v1/user/delete → 개인정보 삭제 요청 API
// 개인정보보호법 준수 — 사용자 요청 시 전체 데이터 삭제

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function DELETE(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = session.user.email

  try {
    // 1. 게이미피케이션 데이터 삭제
    await supabase.from('user_gamification').delete().eq('user_id', email)
    // 2. 배지 삭제
    await supabase.from('user_badges').delete().eq('user_id', email)
    // 3. 리더보드 삭제
    await supabase.from('leaderboard').delete().eq('user_id', email)
    // 4. 학습 진도 삭제
    await supabase.from('learning_progress').delete().eq('user_id', email)
    // 5. 테스트 결과 삭제
    await supabase.from('test_results').delete().eq('user_id', email)
    // 6. 프로필 삭제
    await supabase.from('profiles').delete().eq('email', email)

    // 삭제 완료 로그 (개인정보 포함 금지)
    console.log('[GDPR] User data deleted at:', new Date().toISOString())

    return NextResponse.json({
      ok: true,
      message: '모든 개인정보가 삭제되었습니다. 최대 24시간 이내에 완전히 처리됩니다.',
      deletedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[GDPR] Delete error:', err)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
