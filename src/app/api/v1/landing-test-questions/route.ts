import { NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const TOTAL_Q = 10

// GET /api/v1/landing-test-questions
// chapter_cards에서 무작위 문제를 뽑아 반환 — answer_index/explanation은
// 제외하여 클라이언트(비회원 랜딩 페이지)에 정답이 노출되지 않도록 함.
// chapter-test(P0-3)와 동일한 패턴: 채점은 별도의 landing-test-grade에서
// 서버가 수행.
export async function GET() {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ questions: null })
  }

  const { data, error } = await supabaseAdmin
    .from('chapter_cards')
    .select('id, question, options')
    .in('content_type', ['quiz', 'exam'])
    .in('question_format', ['multiple_choice', 'true_false', 'multiple_select'])
    .limit(80)

  if (error || !data || data.length < TOTAL_Q) {
    return NextResponse.json({ questions: null })
  }

  const questions = [...data]
    .sort(() => Math.random() - 0.5)
    .slice(0, TOTAL_Q)
    .map((q) => ({
      id: q.id,
      question: q.question ?? '',
      options: Array.isArray(q.options) ? q.options : [],
    }))

  return NextResponse.json({ questions })
}
