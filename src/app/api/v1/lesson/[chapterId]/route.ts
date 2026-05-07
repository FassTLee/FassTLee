import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { chapterId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { chapterId } = params

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

  if (chErr) console.error('[lesson API] chapters error:', chErr.message)
  if (qsErr) console.error('[lesson API] chapter_questions error:', qsErr.message)

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
    questions: qs ?? [],
    subjectName,
    courseDesc,
  })
}
