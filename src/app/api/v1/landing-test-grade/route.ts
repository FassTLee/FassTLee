import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import { LANDING_QUESTIONS } from '@/lib/landingTest'

export const dynamic = 'force-dynamic'

interface AnswerRecord {
  id: string
  selected: number | null
}

interface ScoredRecord {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  weakArea?: string
  selected: number
  correct: boolean
}

// POST /api/v1/landing-test-grade
// 클라이언트는 선택한 답(selected)만 전송 — 정답은 서버가 보유한
// LANDING_QUESTIONS(랜딩 전용 고정 5문제) 또는 chapter_cards(DB 문제)에서
// 조회해 채점. test-complete와 동일한 서버사이드 채점 패턴.
export async function POST(req: NextRequest) {
  let body: { answers?: AnswerRecord[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { answers } = body
  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: 'answers required' }, { status: 400 })
  }

  const staticMap = new Map(LANDING_QUESTIONS.map((q) => [q.id, q]))
  const dbIds = answers.map((a) => a.id).filter((id) => !staticMap.has(id))

  type DbCard = { id: string; question: string; options: string[] | null; answer_index: number[] | null; explanation: string | null }
  let dbMap = new Map<string, DbCard>()
  if (dbIds.length > 0 && isSupabaseAdminConfigured) {
    const { data } = await supabaseAdmin
      .from('chapter_cards')
      .select('id, question, options, answer_index, explanation')
      .in('id', dbIds)
    dbMap = new Map((data ?? []).map((c) => [String(c.id), c as DbCard]))
  }

  let score = 0
  const weakAreas: string[] = []

  const scoredRecords: ScoredRecord[] = answers.map((a) => {
    const selected = a.selected ?? -1
    const staticQ = staticMap.get(a.id)

    if (staticQ) {
      const correct = selected === staticQ.correctIndex
      if (correct) score++
      else if (staticQ.weakArea) weakAreas.push(staticQ.weakArea)
      return {
        id: a.id,
        question: staticQ.question,
        options: staticQ.options,
        correctIndex: staticQ.correctIndex,
        explanation: staticQ.explanation,
        weakArea: staticQ.weakArea,
        selected,
        correct,
      }
    }

    const dbQ = dbMap.get(a.id)
    const correctIndex = dbQ?.answer_index?.[0] ?? -1
    const correct = correctIndex !== -1 && selected === correctIndex
    if (correct) score++

    return {
      id: a.id,
      question: dbQ?.question ?? '',
      options: Array.isArray(dbQ?.options) ? dbQ.options : [],
      correctIndex,
      explanation: dbQ?.explanation ?? '',
      selected,
      correct,
    }
  })

  const totalQuestions = answers.length
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0

  return NextResponse.json({
    score,
    totalQuestions,
    percentage,
    weakAreas,
    scoredRecords,
  })
}
