import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET /api/v1/oral-exam/draw?courseId=xxx
// chapters → chapter_questions 에서 랜덤 3문제 추출 (answer_index 제외)
export async function GET(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ questions: [] })
  }

  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  const count    = parseInt(searchParams.get('count') ?? '3')

  if (!courseId) {
    return NextResponse.json({ error: 'courseId required' }, { status: 400 })
  }

  // 1. 해당 course의 chapter 목록 조회
  const { data: chapters, error: chapErr } = await supabaseAdmin
    .from('chapters')
    .select('id')
    .eq('course_id', courseId)

  if (chapErr || !chapters?.length) {
    return NextResponse.json({ questions: [] })
  }

  const chapterIds = chapters.map((c) => c.id)

  // 2. chapter_questions 에서 문제 조회 (answer_index 제외)
  const { data: questions, error: qErr } = await supabaseAdmin
    .from('chapter_questions')
    .select('id, question, options, chapter_id, explanation, exam_years, star_rating')
    .in('chapter_id', chapterIds)
    .eq('question_type', 'oral')
    .not('exam_years', 'is', null)
    .neq('exam_years', '[]')

  if (qErr || !questions?.length) {
    return NextResponse.json({ questions: [] })
  }

  // 3. 셔플 후 3개 추출
  const shuffled = [...questions].sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, count).map((q) => ({
    id:          q.id,
    question:    q.question,
    options:     Array.isArray(q.options) ? q.options : [],
    chapterId:   q.chapter_id,
    explanation: q.explanation ?? null,
    exam_years:  Array.isArray(q.exam_years) ? q.exam_years : [],
    star_rating: q.star_rating ?? null,
  }))

  return NextResponse.json({ questions: picked })
}
