import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import { LESSON_INTERACTION_KEYS, INTERACTION_UNKNOWN_KEY } from '@/lib/lesson-interaction-keys'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  // ── 2026-06-16 수정: P0-1 인증 추가 — 행동 데이터 무결성 보호 (B안: 세션 없으면 skip) ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    // ── 기존 코드 (body userId → session userId로 대체) ──
    // const { userId, chapterId, slideId, durationSeconds, slideIndex } = await req.json()
    // ── 2026-07-15: 이미지 확대 / 체크박스 상호작용 필드 추가 ──
    const {
      chapterId,
      slideId,
      durationSeconds,
      durationMs,
      slideIndex,
      subSlide,
      imageZoomCount,
      checkboxOrderRaw,
      checkboxIntervalsRaw,
      checkboxClickInterval,
      checkboxTotal,
      sessionId,
      slideTotal,
      revisitCount,
      isCompleted,
      advanceTrigger,
      scrollDepth,
      interactionRaw,
    } = await req.json()

    if (!chapterId || !slideId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (durationMs != null && (!Number.isInteger(durationMs) || durationMs < 0)) {
      return NextResponse.json({ error: 'Invalid durationMs' }, { status: 400 })
    }
    const allowedKeys = new Set<string>(Object.values(LESSON_INTERACTION_KEYS))
    const entries = interactionRaw && typeof interactionRaw === 'object' && !Array.isArray(interactionRaw)
      ? Object.entries(interactionRaw) : []
    const known = entries.filter(([key]) => allowedKeys.has(key))
    const unknown = entries.filter(([key]) => !allowedKeys.has(key))
    const sanitizedInteraction = interactionRaw == null ? null : Object.fromEntries([
      ...known,
      ...(unknown.length ? [[INTERACTION_UNKNOWN_KEY, Object.fromEntries(unknown)]] : []),
    ])
    const visits = Number.isInteger(revisitCount) && revisitCount >= 1 ? revisitCount : null
    const trigger = ['swipe', 'arrow', 'button', 'progressbar', 'back', 'retry', 'auto'].includes(advanceTrigger)
      ? advanceTrigger : null

    const { error } = await supabaseAdmin
      .from('lesson_slide_logs')
      .insert({
        user_id: session.user.id,
        chapter_id: chapterId,
        slide_index: slideIndex ?? 0,
        // 구클라이언트의 초 필드도 허용하고, 저장 단위는 초로 유지한다.
        slide_retention_time: durationMs != null ? durationMs / 1000 : durationSeconds ?? 0,
        is_completed: isCompleted === true,
        session_id: sessionId ?? null,
        slide_total: Number.isInteger(slideTotal) ? slideTotal : null,
        revisit_count: visits,
        is_revisit: visits == null ? null : visits > 1,
        advance_trigger: trigger,
        scroll_depth: typeof scrollDepth === 'number' && Number.isFinite(scrollDepth)
          ? Math.max(0, Math.min(1, scrollDepth)) : null,
        interaction_raw: sanitizedInteraction,
        // ── 2026-07-15: subSlide 라벨 + 상호작용 로그 (subSlide별 값 격리) ──
        // 값이 안 온 필드는 null 유지 — "이 슬라이드엔 해당 없음"을 null로 표현 (0으로 강제하지 않음)
        sub_slide:               subSlide ?? null,              // smallint (0=학습/1=체크포인트/2=미니퀴즈)
        image_zoom_count:        imageZoomCount ?? null,        // integer (학습 슬라이드 row에만)
        checkbox_order_raw:      checkboxOrderRaw ?? null,      // jsonb   (체크포인트 row에만)
        checkbox_intervals_raw:  checkboxIntervalsRaw ?? null,  // jsonb   (체크포인트 row에만)
        checkbox_click_interval: checkboxClickInterval ?? null, // double  (체크포인트 row에만)
        checkbox_total:          checkboxTotal ?? null,         // integer (체크포인트 row에만)
      })

    if (error) {
      console.error('[lesson-log] insert error:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[lesson-log] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
