// /api/v1/c9d2b → Gamification API (난독화)
// Rate limit: 분당 60회 (middleware에서 처리)

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const DB_UNAVAILABLE = NextResponse.json(
  { error: 'Database not configured' },
  { status: 503 }
)

// GET: 게이미피케이션 현황 조회
export async function GET(_req: NextRequest) {
  if (!isSupabaseConfigured) return DB_UNAVAILABLE

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_gamification')
    .select('xp, level, streak_days, last_study_date')
    .eq('user_id', session.user.email)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? { xp: 0, level: 1, streak_days: 0, last_study_date: null }
  })
}

// PATCH: XP / 스트릭 업데이트
export async function PATCH(req: NextRequest) {
  if (!isSupabaseConfigured) return DB_UNAVAILABLE

  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad Request' }, { status: 400 })

  const { error } = await supabase
    .from('user_gamification')
    .upsert({
      user_id: session.user.email,
      xp: body.xp ?? 0,
      level: body.level ?? 1,
      streak_days: body.streakDays ?? 0,
      last_study_date: body.lastStudyDate ?? null,
      updated_at: new Date().toISOString(),
    })

  if (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
