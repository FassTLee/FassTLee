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
    const { chapterId, action, sessionId, exitPoint, isCompleted, pageType } = body

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

    // 진입: 새 세션 INSERT
    if (action === 'enter') {
      const newSessionId = crypto.randomUUID()
      const { error } = await supabaseAdmin
        .from('chapter_session_logs')
        .insert({
          user_id:       userId,
          chapter_id:    chapterId,
          session_id:    newSessionId,
          session_start: new Date().toISOString(),
          is_completed:  false,
          page_type:     pageType ?? 'test',
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
          session_end:  now.toISOString(),
          is_completed: isCompleted ?? false,
          exit_point:   exitPoint ?? null,
          day_of_week:  now.getDay(),
          hour_of_day:  now.getHours(),
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
