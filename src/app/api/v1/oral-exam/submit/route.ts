import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import { recordAnswer } from '@/lib/wrongAnswerStore'

export const dynamic = 'force-dynamic'

// POST /api/v1/oral-exam/submit
// body: { questionId, isCorrect }
// 주관식 자기평가 결과를 신뢰해 통합 오답/이벤트 로그에 기록
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ correct: false, answerIndex: 0, explanation: null })
  }

  const session = await getServerSession(authOptions)
  const body = await req.json() as { questionId?: string; isCorrect?: boolean }
  const { questionId, isCorrect } = body

  if (!questionId || typeof isCorrect !== 'boolean') {
    return NextResponse.json({ error: 'questionId and isCorrect required' }, { status: 400 })
  }

  // 문제의 챕터·해설 조회. 정오답은 클라이언트 자기평가값을 사용한다.
  const { data: q, error } = await supabaseAdmin
    .from('chapter_cards')
    .select('answer_index, explanation, chapter_id')
    .eq('id', questionId)
    .single()

  if (error || !q) {
    return NextResponse.json({ error: 'Question not found' }, { status: 404 })
  }

  const userId = session?.user?.id
  if (userId) {
    await recordAnswer({
      userId,
      questionId,
      chapterId:          q.chapter_id ?? null,
      surface:            'oral_exam',
      selectedIndex:      -1,
      correctIndex:       null,
      isCorrect,
      answeredAt:         new Date(),
      afterWrongAction:   'self_assessed',
      retryCount:         null,
      explanationViewed:  true,
    })
  }

  return NextResponse.json({
    correct: isCorrect,
    answerIndex: q.answer_index,
    explanation: q.explanation ?? null,
  })
}
