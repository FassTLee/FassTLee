// /api/v1/chapter-stats → chapters/[subjectId] 진도 표시용 chapter_stats 조회
// ── 2026-08-06 신설: anon 클라이언트 직접 조회를 서버로 이관 ──
// chapter_stats의 RLS 정책(qual=TRUE)이 제거되면 anon 조회는 에러가 아니라 빈 배열을
// 반환해 진도가 조용히 사라진다. 조회 자체는 service_role로 수행하고,
// user_id는 세션에서만 취한다 — 쿼리·body의 userId fallback을 두지 않는다.

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  // 200+[]로 응답하면 화면에서 "데이터 없음"과 구분되지 않아, 환경변수 누락이
  // 진도율 0%로만 나타나고 로그에 남지 않는다 — 이 트랙이 제거하려는 실패 모드와 같다
  if (!isSupabaseAdminConfigured) {
    console.error('[chapter-stats] supabaseAdmin not configured')
    return NextResponse.json(
      { error: 'Server misconfigured' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    )
  }

  const certId = req.nextUrl.searchParams.get('certId')

  let query = supabaseAdmin
    .from('chapter_stats')
    .select('chapter_id, subject_id, avg_score, wrong_rate, total_attempts, last_attempt_at, lesson_completed, mini_quiz_correct, mini_quiz_total, lesson_completed_at, latest_score, best_score, test_attempts, total_questions')
    .eq('user_id', userId)

  // certId가 있는 자격증(같은 챕터를 여러 자격증이 공유하는 경우, 예: IIPA Lv1/Lv2)만
  // 그 자격증 문맥의 진도로 좁혀서 조회. certId가 없으면(레거시 자격증 — chapter_id 자체가
  // 자격증 간 공유되지 않으므로 certification_id로 좁힐 필요가 없음) user_id만으로 조회 —
  // 백필로 certification_id가 채워진 기존 행도 그대로 잡혀야 하므로 여기서
  // certification_id 필터를 걸면 안 됨(걸면 기존 진도가 전부 안 보이게 됨)
  if (certId) query = query.eq('certification_id', certId)

  const { data, error } = await query.order('updated_at', { ascending: false, nullsFirst: false })

  if (error) {
    console.error('[chapter-stats] select error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  // 화면(statsMap 구성)이 기대하는 배열 구조를 그대로 유지한다
  return NextResponse.json(data ?? [], { headers: { 'Cache-Control': 'no-store' } })
}
