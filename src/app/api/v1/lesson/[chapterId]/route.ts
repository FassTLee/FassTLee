import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { chapterId: string } },
) {
  const { chapterId } = params
  console.log('[lesson API] chapterId:', chapterId)
  console.log('[lesson API] env check — url:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), 'serviceKey:', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY))

  const [{ data: ch, error: chErr }, { data: qs, error: qsErr }] = await Promise.all([
    supabaseAdmin
      .from('chapters')
      .select('id, title, course_id')
      .eq('id', chapterId)
      .single(),
    supabaseAdmin
      .from('chapter_questions')
      .select('id, question, options, answer_index, explanation, difficulty')
      .eq('chapter_id', chapterId),
  ])

  console.log('[lesson API] chapters —', ch?.id ?? null, chErr?.message ?? 'ok')
  console.log('[lesson API] chapter_questions —', qs?.length ?? 0, qsErr?.message ?? 'ok')

  let subjectName = ''
  let courseDesc: string | null = null

  if (ch?.course_id) {
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('id, subject_id, description')
      .eq('id', ch.course_id)
      .single()

    if (course?.description) courseDesc = course.description
    if (course?.subject_id) {
      const { data: subj } = await supabaseAdmin
        .from('subjects')
        .select('name')
        .eq('id', course.subject_id)
        .single()
      if (subj?.name) subjectName = subj.name
    }
  }

  return NextResponse.json({
    chapter: ch ?? null,
    slides: (qs ?? []).map((q) => ({
      id:           q.id,
      question:     q.question,
      explanation:  q.explanation ?? null,
      options:      q.options,
      answer_index: q.answer_index,
      difficulty:   q.difficulty ?? null,
    })),
    subjectName,
    courseDesc,
  })
}
