// /api/v1/user/delete → 개인정보 삭제 요청 API
// 개인정보보호법 준수 — 사용자 요청 시 전체 데이터 삭제

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const DB_UNAVAILABLE = NextResponse.json(
  { error: 'Database not configured' },
  { status: 503 }
)

export async function DELETE(req: NextRequest) {
  if (!isSupabaseConfigured) return DB_UNAVAILABLE

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string

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
