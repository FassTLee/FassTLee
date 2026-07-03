import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// POST /api/v1/oral-exam/submit
// body: { questionId, selectedIndex }
// 서버에서 answer_index 와 대조 → 정답 여부 + 해설 반환
// 오답 시 user_wrong_answers 에 upsert (테이블 없으면 무시)
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ correct: false, answerIndex: 0, explanation: null })
  }

  const session = await getServerSession(authOptions)
  const body = await req.json() as { questionId?: string; selectedIndex?: number }
  const { questionId, selectedIndex } = body

  if (!questionId || selectedIndex === undefined || selectedIndex === null) {
    return NextResponse.json({ error: 'questionId and selectedIndex required' }, { status: 400 })
  }

  // 실제 정답 조회
  const { data: q, error } = await supabaseAdmin
    .from('chapter_cards')
    .select('answer_index, explanation, chapter_id')
    .eq('id', questionId)
    .single()

  if (error || !q) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const correct = q.answer_index?.includes(selectedIndex)

  // 오답이면 user_wrong_answers 에 저장
  const userId = session?.user?.id
  if (!correct && userId) {
    const { error: wrongAnswerError } = await supabaseAdmin
      .from('user_wrong_answers')
      .upsert(
        {
          user_id:        userId,
          question_id:    questionId,
          chapter_id:     q.chapter_id ?? null,
          selected_index: selectedIndex,
          correct_index:  q.answer_index?.[0],
          wrong_count:    1,
          last_wrong_at:  new Date().toISOString(),
        },
        { onConflict: 'user_id,question_id' },
      )

    if (wrongAnswerError) {
      console.error('[oral-exam/submit] user_wrong_answers upsert error:', wrongAnswerError)
    }
  }

  return NextResponse.json({
    correct,
    answerIndex: q.answer_index,
    explanation: q.explanation ?? null,
  })
}
