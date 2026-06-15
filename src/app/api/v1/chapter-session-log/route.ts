import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }
  try {
    const { userId, chapterId, action, sessionId, exitPoint, isCompleted, pageType } = await req.json()

    if (!userId || !chapterId || !action) {
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
      const { error } = await supabaseAdmin
        .from('chapter_session_logs')
        .update({
          session_end:  new Date().toISOString(),
          is_completed: isCompleted ?? false,
          exit_point:   exitPoint ?? null,
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
