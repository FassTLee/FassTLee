import 'server-only'

import { questionTypeCode } from '@/lib/quizLog'
import { supabaseAdmin } from '@/lib/supabase-admin'

const REVIEW_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const
const AFTER_WRONG_ACTIONS = new Set(['explanation', 'retry', 'next', 'exit', 'self_assessed'])

type AnswerSurface = 'mini_quiz' | 'chapter_test' | 'mock_exam' | 'oral_exam'

type WrongAnswerRow = {
  id: string
  chapter_id: string | null
  wrong_count: number
  review_stage: number
  next_review_at: string | null
}

type RecordAnswerInput = {
  userId: string
  questionId: string
  chapterId: string | null
  surface: AnswerSurface
  selectedIndex: number
  correctIndex: number | null
  isCorrect: boolean
  answeredAt: Date
  responseTime?: number | null
  quizEnteredAt?: Date | null
  afterWrongAction?: string | null
  retryCount?: number | null
  explanationViewed?: boolean | null
}

function nextReviewAt(answeredAt: Date, reviewStage: number): string {
  const intervalDays = REVIEW_INTERVAL_DAYS[reviewStage - 1]
  return new Date(answeredAt.getTime() + intervalDays * 24 * 60 * 60 * 1000).toISOString()
}

export async function recordAnswer(input: RecordAnswerInput): Promise<{ logId: string | null }> {
  let reviewStageBefore: number | null = null
  let reviewStageAfter: number | null = null
  let prescribedReviewAt: string | null = null

  try {
    const { data, error } = await supabaseAdmin
      .from('user_wrong_answers')
      .select('id, chapter_id, wrong_count, review_stage, next_review_at')
      .eq('user_id', input.userId)
      .eq('question_id', input.questionId)
      .maybeSingle()

    if (error) throw error

    const existing = data as WrongAnswerRow | null
    reviewStageBefore = existing?.review_stage ?? null
    reviewStageAfter = reviewStageBefore
    prescribedReviewAt = existing?.next_review_at ?? null

    if (!input.isCorrect) {
      if (!existing) {
        const { error: insertError } = await supabaseAdmin
          .from('user_wrong_answers')
          .insert({
            user_id:            input.userId,
            question_id:        input.questionId,
            chapter_id:         input.chapterId,
            selected_index:     input.selectedIndex,
            correct_index:      input.correctIndex,
            wrong_count:        1,
            review_stage:       1,
            next_review_at:     nextReviewAt(input.answeredAt, 1),
            last_wrong_surface: input.surface,
            last_wrong_at:      input.answeredAt.toISOString(),
          })

        if (insertError) throw insertError
        reviewStageAfter = 1
      } else {
        const newStage = Math.max(1, existing.review_stage - 1)
        const update: Record<string, unknown> = {
          selected_index:     input.selectedIndex,
          correct_index:      input.correctIndex,
          wrong_count:        existing.wrong_count + 1,
          review_stage:       newStage,
          next_review_at:     nextReviewAt(input.answeredAt, newStage),
          last_wrong_surface: input.surface,
          last_wrong_at:      input.answeredAt.toISOString(),
        }
        if (existing.chapter_id === null && input.chapterId !== null) {
          update.chapter_id = input.chapterId
        }

        const { error: updateError } = await supabaseAdmin
          .from('user_wrong_answers')
          .update(update)
          .eq('id', existing.id)

        if (updateError) throw updateError
        reviewStageAfter = newStage
      }
    } else if (existing && existing.next_review_at !== null) {
      const isDue = input.answeredAt.getTime() >= new Date(existing.next_review_at).getTime()
      if (isDue) {
        const newStage = Math.min(5, existing.review_stage + 1)
        const newNextReviewAt = existing.review_stage >= 5
          ? null
          : nextReviewAt(input.answeredAt, newStage)

        const { error: updateError } = await supabaseAdmin
          .from('user_wrong_answers')
          .update({
            review_stage:   newStage,
            next_review_at: newNextReviewAt,
          })
          .eq('id', existing.id)

        if (updateError) throw updateError
        reviewStageAfter = newStage
      }
    }
  } catch (error) {
    console.warn('[recordAnswer] user_wrong_answers save failed:', error)
    reviewStageAfter = reviewStageBefore
  }

  try {
    const questionType = questionTypeCode(input.surface)
    if (questionType === undefined) {
      throw new Error(`Unknown answer surface: ${input.surface}`)
    }

    const { data, error } = await supabaseAdmin
      .from('quiz_performance_logs')
      .insert({
        user_id:                  input.userId,
        chapter_id:               input.chapterId,
        question_id:              input.questionId,
        question_type:            questionType,
        is_correct:               input.isCorrect,
        answer_given:             input.selectedIndex,
        response_time:            input.responseTime ?? null,
        quiz_entered_at:          input.quizEnteredAt?.toISOString() ?? null,
        after_wrong_action:       input.afterWrongAction && AFTER_WRONG_ACTIONS.has(input.afterWrongAction)
          ? input.afterWrongAction
          : null,
        retry_count:              input.retryCount ?? null,
        explanation_viewed:       input.explanationViewed ?? null,
        review_stage_before:      reviewStageBefore,
        review_stage_after:       reviewStageAfter,
        prescribed_review_at:     prescribedReviewAt,
      })
      .select('id')
      .single()

    if (error) throw error
    return { logId: data?.id ?? null }
  } catch (error) {
    console.warn('[recordAnswer] quiz_performance_logs save failed:', error)
    return { logId: null }
  }
}
