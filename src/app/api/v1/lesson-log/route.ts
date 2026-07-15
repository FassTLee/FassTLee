import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

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
      slideIndex,
      subSlide,
      imageZoomCount,
      checkboxOrderRaw,
      checkboxIntervalsRaw,
      checkboxClickInterval,
      checkboxTotal,
    } = await req.json()

    if (!chapterId || !slideId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('lesson_slide_logs')
      .insert({
        user_id: session.user.id,
        chapter_id: chapterId,
        slide_index: slideIndex ?? 0,
        slide_retention_time: durationSeconds ?? 0,
        is_completed: false,
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
