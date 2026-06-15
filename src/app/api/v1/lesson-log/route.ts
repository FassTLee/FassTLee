import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    const { userId, chapterId, slideId, durationSeconds, slideIndex } = await req.json()

    if (!userId || !chapterId || !slideId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('lesson_slide_logs')
      .insert({
        user_id: userId,
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
