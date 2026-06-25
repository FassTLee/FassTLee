import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// ── 2026-06-25 수정: P1-12 서버사이드 채점 — 클라이언트는 selected만 전송, 정답은 서버 보유 ──
interface Record {
  questionId: string
  selected?: number
  user_answer?: string
  content_type?: string
  question_format?: string | null
}

interface ScoredRecord {
  questionId: string
  question: string
  options: string[]
  answer_index: number[]
  explanation: string | null
  selected: number
  correct: boolean
  user_answer: string
  content_type: string | null
  question_format: string | null
}

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const session = await getServerSession(authOptions)
  const body = await req.json()
  const { chapterId, subjectId, records } = body as {
    chapterId: string; subjectId: string; records: Record[]; userId?: string
  }

  // ── 기존 코드 (body.userId fallback → IDOR 취약점) ──
  // const userId = session?.user?.id ?? body.userId
  // ── 2026-06-16 수정: P0-3 session만 신뢰, 비로그인 시 skip ──
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ ok: true, saved: false })
  if (!chapterId || !Array.isArray(records)) {
    return NextResponse.json({ ok: true, saved: false })
  }

  // ── 서버사이드 채점: chapter_cards에서 정답/콘텐츠 조회 후 채점 ──
  const questionIds = records.map((r) => String(r.questionId))
  const { data: cards, error: cardsError } = await supabaseAdmin
    .from('chapter_cards')
    .select('id, question, options, answer_index, explanation')
    .in('id', questionIds)

  if (cardsError) {
    return NextResponse.json({ ok: false, saved: false, error: 'Failed to load answer data' })
  }

  const cardMap = new Map((cards ?? []).map((c) => [String(c.id), c]))

  const scoredRecords: ScoredRecord[] = records.map((r) => {
    const card = cardMap.get(String(r.questionId))
    const isShortAnswer = r.question_format === 'short_answer'
    // 주관식은 자동채점 불가(P2-12에서 처리), 카드 없으면 오답 처리
    const correct = !!card && !isShortAnswer && r.selected === card.answer_index?.[0]
    return {
      questionId:      String(r.questionId),
      question:        card?.question ?? '',
      options:         card?.options ?? [],
      answer_index:    card?.answer_index ?? [],
      explanation:     card?.explanation ?? null,
      selected:        r.selected ?? -1,
      correct,
      user_answer:     r.user_answer ?? '',
      content_type:    r.content_type ?? null,
      question_format: r.question_format ?? null,
    }
  })

  const total        = scoredRecords.length
  const correctCount = scoredRecords.filter((r) => r.correct).length
  const score        = total > 0 ? Math.round((correctCount / total) * 100) : 0

  const { data: existing } = await supabaseAdmin
    .from('chapter_stats')
    .select('total_attempts, total_correct, avg_score, best_score, test_attempts')
    .eq('user_id', userId)
    .eq('chapter_id', chapterId)
    .maybeSingle()

  const oldAttempts     = existing?.total_attempts  ?? 0
  const oldCorrect      = existing?.total_correct   ?? 0
  const oldAvg          = existing?.avg_score       ?? 0
  const oldBestScore    = existing?.best_score      ?? 0
  const oldTestAttempts = existing?.test_attempts   ?? 0

  const newAttempts     = oldAttempts + 1
  const newCorrect      = oldCorrect + correctCount
  const newAvg          = Math.round((oldAvg * oldAttempts + score) / newAttempts)
  const newWrongRate    = newAttempts > 0
    ? Math.round(((newAttempts * total - newCorrect) / (newAttempts * total)) * 100)
    : 0
  const newTestAttempts = oldTestAttempts + 1
  const newBestScore    = Math.max(score, oldBestScore)

  await supabaseAdmin.from('chapter_stats').upsert(
    {
      user_id:         userId,
      chapter_id:      chapterId,
      subject_id:      subjectId ?? '',
      total_attempts:  newAttempts,
      total_correct:   newCorrect,
      avg_score:       newAvg,
      wrong_rate:      newWrongRate,
      latest_score:    score,
      best_score:      newBestScore,
      test_attempts:   newTestAttempts,
      total_questions: total,
      last_attempt_at: new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    },
    { onConflict: 'user_id,chapter_id' }
  )

  await supabaseAdmin.from('chapter_test_history').insert({
    user_id:        userId,
    chapter_id:     chapterId,
    score:          score,
    attempt_number: newTestAttempts,
  })

  await Promise.all(
    scoredRecords.map(async (r) => {
      const { data: existingQ } = await supabaseAdmin
        .from('question_stats')
        .select('total_attempts, total_correct')
        .eq('user_id', userId)
        .eq('question_id', String(r.questionId))
        .maybeSingle()

      const qOld      = existingQ?.total_attempts ?? 0
      const qOldRight = existingQ?.total_correct  ?? 0
      const qAttempts = qOld + 1
      const qCorrect  = qOldRight + (r.correct ? 1 : 0)
      const qWrongRate = Math.round(((qAttempts - qCorrect) / qAttempts) * 100)

      await supabaseAdmin.from('question_stats').upsert(
        {
          user_id:        userId,
          question_id:    String(r.questionId),
          chapter_id:     chapterId,
          total_attempts: qAttempts,
          total_correct:  qCorrect,
          wrong_rate:     qWrongRate,
          updated_at:     new Date().toISOString(),
        },
        { onConflict: 'user_id,question_id' }
      )
    })
  )

  // ── wrong_answers insert (오답 레코드만) ──────────────────────────
  const wrongRecords = scoredRecords.filter((r) => !r.correct)
  if (wrongRecords.length > 0) {
    await supabaseAdmin.from('wrong_answers').insert(
      wrongRecords.map((r) => ({
        user_id:         userId,
        chapter_id:      chapterId,
        question_id:     String(r.questionId),
        selected_option: String(r.selected    ?? ''),
        correct_option:  String(r.answer_index?.[0] ?? ''),
      }))
    )
  }

  return NextResponse.json({ ok: true, saved: true, scoredRecords })
}
