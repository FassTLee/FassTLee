import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { chapterId: string } },
) {
  // 환경변수 존재 여부 확인
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log(`[lesson API] env check — url:${hasUrl} serviceKey:${hasServiceKey}`)

  const { chapterId } = params
  console.log('[lesson API] chapterId:', chapterId)

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

  console.log('[lesson API] chapters result — data:', ch?.id ?? null, 'error:', chErr?.message ?? null)
  console.log('[lesson API] chapter_questions result — count:', qs?.length ?? 0, 'error:', qsErr?.message ?? null)

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

  console.log('[lesson API] response — questions:', qs?.length ?? 0, 'subjectName:', subjectName)

  return NextResponse.json({
    chapter: ch ?? null,
    questions: qs ?? [],
    subjectName,
    courseDesc,
  })
}
