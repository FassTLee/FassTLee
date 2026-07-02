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

  const { chapterId, subjectId, certId } = await req.json()
  if (!chapterId) return NextResponse.json({ error: 'Missing chapterId' }, { status: 400 })

  // certId가 있으면 그 자격증 문맥의 행만, 없으면 certification_id가 NULL인 행만 확인
  // (같은 chapter_id를 여러 자격증이 공유하는 경우 — 예: IIPA Lv1/Lv2 — 진도를 분리 추적)
  let existingQuery = supabaseAdmin
    .from('chapter_stats')
    .select('id')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
  existingQuery = certId ? existingQuery.eq('certification_id', certId) : existingQuery.is('certification_id', null)
  const { data: existing } = await existingQuery.maybeSingle()

  if (!existing) {
    const { error } = await supabaseAdmin.from('chapter_stats').insert({
      user_id:          userId,
      chapter_id:       chapterId,
      subject_id:       subjectId ?? null,
      certification_id: certId ?? null,
      lesson_completed: false,
      test_attempts:    0,
      latest_score:     null,
    })
    if (error) console.error('[chapter-init] insert error:', error)
  }

  return NextResponse.json({ ok: true })
}
