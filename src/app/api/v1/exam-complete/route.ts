import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import { recordAnswer } from '@/lib/wrongAnswerStore'

export const dynamic = 'force-dynamic'

const SUBJECT_PASS_Q = 8
const PASS_RATIO     = 0.6

interface ClientQuestion {
  id:       string
  selected: number
}

interface ClientSubject {
  name:      string
  questions: ClientQuestion[]
}

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { subjects, abandoned, timeRemaining } = body as {
    subjects:      ClientSubject[]
    abandoned:     boolean
    timeRemaining: number
  }

  // 전체 문제 ID 수집 후 한 번에 조회
  const allIds = subjects.flatMap((s) => s.questions.map((q) => q.id))

  const { data: cards, error: cardsError } = await supabaseAdmin
    .from('chapter_cards')
    .select('id, chapter_id, question, options, answer_index, explanation')
    .in('id', allIds)

  if (cardsError || !cards) {
    console.error('[exam-complete] chapter_cards fetch error:', cardsError)
    return NextResponse.json({ error: 'Failed to load answer data' }, { status: 500 })
  }

  const cardMap = new Map(cards.map((c) => [c.id, c]))

  // 서버사이드 채점
  const scoredSubjects = subjects.map((subj) => {
    const questions = subj.questions.map((q) => {
      const card    = cardMap.get(q.id)
      const correct = card && q.selected !== -1 && card.answer_index?.[0] != null && card.answer_index[0] !== -1
        ? q.selected === card.answer_index[0]
        : false
      return {
        id:           q.id,
        question:     card?.question    ?? '',
        options:      card?.options     ?? [],
        answer_index: card?.answer_index ?? [],
        explanation:  card?.explanation ?? null,
        selected:     q.selected,
        correct,
      }
    })
    const score = questions.filter((q) => q.correct).length
    const total = questions.length
    return {
      name:    subj.name,
      score,
      total,
      passed:  score >= SUBJECT_PASS_Q,
      questions,
    }
  })

  const totalScore     = scoredSubjects.reduce((s, r) => s + r.score, 0)
  const totalQuestions = scoredSubjects.reduce((s, r) => s + r.total, 0)
  const hasSubjectFail = scoredSubjects.some((r) => !r.passed)
  const passed         = !hasSubjectFail && totalQuestions > 0
                         && totalScore / totalQuestions >= PASS_RATIO

  const answeredAt = new Date()
  await Promise.all(
    scoredSubjects.flatMap((subject) => subject.questions.map((question) => {
      const card = cardMap.get(question.id)
      return recordAnswer({
        userId:             session.user.id,
        questionId:         question.id,
        chapterId:          card?.chapter_id ?? null,
        surface:            'mock_exam',
        selectedIndex:      question.selected,
        correctIndex:       question.answer_index?.[0] ?? null,
        isCorrect:          question.correct,
        answeredAt,
        retryCount:         null,
        explanationViewed:  null,
      })
    }))
  )

  const { data, error } = await supabaseAdmin
    .from('exam_results')
    .insert({
      user_id:         session.user.id,
      round:           1,
      subject_scores:  scoredSubjects,
      score:           totalScore,
      total_questions: totalQuestions,
      passed,
      abandoned,
      time_remaining:  timeRemaining,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[exam-complete] insert error:', error)
    return NextResponse.json({
      ok:             true,
      saved:          false,
      scoredSubjects,
      totalScore,
      totalQuestions,
      passed,
    })
  }

  return NextResponse.json({
    ok:             true,
    saved:          true,
    examId:         data?.id,
    scoredSubjects,
    totalScore,
    totalQuestions,
    passed,
  })
}
