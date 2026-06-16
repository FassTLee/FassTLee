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
    const { chapterId, slideId, durationSeconds, slideIndex } = await req.json()

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
