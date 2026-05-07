import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import LessonClient from './LessonClient'

export default async function LessonPage({
  params,
}: {
  params: { chapterId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/landing')

  const { chapterId } = params

  console.log('[LessonPage] chapterId:', chapterId)
  console.log('[LessonPage] SUPABASE_URL set:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL))
  console.log('[LessonPage] SERVICE_ROLE_KEY set:', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY))

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

  console.log('[LessonPage] chapters — id:', ch?.id ?? null, 'error:', chErr?.message ?? null)
  console.log('[LessonPage] chapter_questions — count:', qs?.length ?? 0, 'error:', qsErr?.message ?? null)

  let subjectName = ''
  if (ch?.course_id) {
    const { data: course } = await supabaseAdmin
      .from('courses')
      .select('subject_id')
      .eq('id', ch.course_id)
      .single()
    if (course?.subject_id) {
      const { data: subj } = await supabaseAdmin
        .from('subjects')
        .select('name')
        .eq('id', course.subject_id)
        .single()
      if (subj?.name) subjectName = subj.name
    }
  }

  return (
    <LessonClient
      chapterId={chapterId}
      chapterTitle={ch?.title ?? ''}
      subjectName={subjectName}
      questions={(qs ?? []).map((q) => ({
        id:           q.id,
        question:     q.question,
        options:      q.options,
        answer_index: q.answer_index,
        explanation:  q.explanation ?? null,
        difficulty:   q.difficulty ?? null,
      }))}
    />
  )
}
