import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id
  if (!isSupabaseAdminConfigured) return NextResponse.json({ ok: true, saved: false })

  const { chapterId, subjectId } = await req.json()
  if (!chapterId) return NextResponse.json({ error: 'Missing chapterId' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('chapter_stats')
    .upsert(
      {
        user_id:          userId,
        chapter_id:       chapterId,
        subject_id:       subjectId ?? null,
        lesson_completed: false,
        test_attempts:    0,
        latest_score:     null,
      },
      { onConflict: 'user_id,chapter_id', ignoreDuplicates: true }
    )

  if (error) console.error('[chapter-init] upsert error:', error)

  return NextResponse.json({ ok: true })
}
