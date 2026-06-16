import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/v1/chapter-test?chapterId=xxx
// answer_index / explanation 제거 후 반환 — 클라이언트 정답 노출 차단 (P0-3)
export async function GET(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ questions: [] })
  }

  // ── 2026-06-16 수정: P0-3 인증 추가 ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const chapterId = searchParams.get('chapterId')
  if (!chapterId) {
    return NextResponse.json({ error: 'chapterId required' }, { status: 400 })
  }

  // ── 2026-06-16 수정: P0-3 explanation 복구 — 모범답안 텍스트는 정답 인덱스(answer_index)가 아니므로 노출 허용. 채점 고도화는 P2-12에서 진행
  const { data: basicData } = await supabaseAdmin
    .from('chapter_questions')
    .select('id, question, options, explanation, image_url, reference_text, question_type, exam_years, star_rating')
    .eq('chapter_id', chapterId)
    .eq('question_type', 'basic')
    .not('answer_index', 'is', null)

  const { data: oralData } = await supabaseAdmin
    .from('chapter_questions')
    .select('id, question, options, explanation, image_url, reference_text, question_type, exam_years, star_rating')
    .eq('chapter_id', chapterId)
    .eq('question_type', 'oral')
    .not('exam_years', 'is', null)
    .neq('exam_years', '[]')

  return NextResponse.json({
    basic: basicData ?? [],
    oral: oralData ?? [],
  })
}
