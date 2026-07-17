import { NextRequest, NextResponse } from 'next/server'
// ── 기존 코드 ──
// import { getServerSession } from 'next-auth'
// import { authOptions } from '@/lib/auth'
// ── 2026-06-16 수정: sendBeacon 인증 호환 — getToken으로 교체 ──
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    // ── body를 먼저 파싱 — getToken이 req stream을 소비하기 전에 읽어야 함 ──
    const body = await req.json()
    // ── 2026-07-16(배치3): 이탈 위치 기록 — lastSlide(카드 인덱스)/lastSubSlide(0/1/2) 추가 ──
    const { chapterId, action, sessionId, exitPoint, isCompleted, pageType, lastSlide, lastSubSlide } = body

    // ── 기존 코드 ──
    // const session = await getServerSession(authOptions)
    // if (!session?.user?.id) {
    //   return NextResponse.json({ ok: true, skipped: true })
    // }
    // ── 2026-06-16 수정: getToken — sendBeacon Content-Type: text/plain 환경에서도 인증 가능 ──
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ ok: true, skipped: true })
    }
    // ── 2026-06-16 수정: token.sub는 카카오 원본 ID(비-UUID) — token.userId(stableId UUID)를 우선 사용 ──
    const userId = (token.userId as string | undefined) ?? token.sub
    if (!userId) return NextResponse.json({ ok: true, skipped: true })

    if (!chapterId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 진입: 새 세션 INSERT (단, 방금 만든 미종료 세션이 있으면 재사용 — 멱등 가드)
    if (action === 'enter') {
      const resolvedPageType = pageType ?? 'test'

      // ── 2026-07-16(배치3): enter 멱등 가드 ──
      // 이중 마운트(StrictMode)/리렌더로 enter가 2번 오면 세션이 2개 생겨 한쪽이 고아 row로 남았음.
      // 같은 user+chapter+page_type의 "방금 생성된 미종료 세션"이 있으면 그 session_id를 재사용한다.
      // 시간 창(30초)이 필수인 이유: session_end IS NULL 조건만 쓰면 며칠 전 고아 세션까지
      // 재사용해버림. 정상 재학습(나중에 같은 챕터 다시 열기)은 새 세션이어야 하므로 최근 것만 한정.
      // (정상 이탈 시엔 exit가 session_end를 채우므로 애초에 재사용 대상에서 빠짐)
      const REUSE_WINDOW_MS = 30_000
      const since = new Date(Date.now() - REUSE_WINDOW_MS).toISOString()
      const { data: recent } = await supabaseAdmin
        .from('chapter_session_logs')
        .select('session_id')
        .eq('user_id', userId)
        .eq('chapter_id', chapterId)
        .eq('page_type', resolvedPageType)
        .is('session_end', null)
        .gte('session_start', since)
        .order('session_start', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recent?.session_id) {
        return NextResponse.json({ success: true, sessionId: recent.session_id, reused: true })
      }

      const newSessionId = crypto.randomUUID()
      const { error } = await supabaseAdmin
        .from('chapter_session_logs')
        .insert({
          user_id:       userId,
          chapter_id:    chapterId,
          session_id:    newSessionId,
          session_start: new Date().toISOString(),
          is_completed:  false,
          page_type:     resolvedPageType,
        })
      if (error) {
        console.error('[chapter-session-log] enter insert error:', error)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
      return NextResponse.json({ success: true, sessionId: newSessionId })
    }

    // 완료/이탈: 기존 세션 UPDATE
    if (action === 'exit') {
      if (!sessionId) {
        return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
      }
      // ── 2026-06-16 수정: P1-16 행동 데이터 — 요일/시간대 기록 추가 ──
      const now = new Date()
      const { error } = await supabaseAdmin
        .from('chapter_session_logs')
        .update({
          session_end:   now.toISOString(),
          is_completed:  isCompleted ?? false,
          exit_point:    exitPoint ?? null,
          day_of_week:   now.getDay(),
          hour_of_day:   now.getHours(),
          last_slide:    lastSlide ?? null,     // 이탈 시점 카드 인덱스
          last_sub_slide: lastSubSlide ?? null, // 이탈 시점 subSlide (0=학습/1=체크포인트/2=미니퀴즈)
        })
        .eq('session_id', sessionId)
        .eq('user_id', userId)
      if (error) {
        console.error('[chapter-session-log] exit update error:', error)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (e) {
    console.error('[chapter-session-log] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
