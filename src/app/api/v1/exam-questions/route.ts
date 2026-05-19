import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const SUBJECT_NAMES = [
  '운동생리학', '건강체력평가', '운동처방론', '운동부하검사',  // 1교시
  '운동상해',   '기능해부학',   '병태생리학', '스포츠심리학',  // 2교시
]
const Q_PER_SUBJECT = 20

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ subjects: [] })
  }

  const subjects = await Promise.all(
    SUBJECT_NAMES.map(async (name) => {
      const { data: subjectRow } = await supabaseAdmin
        .from('subjects')
        .select('id')
        .eq('name', name)
        .single()

      if (!subjectRow) return { name, questions: [] }

      const { data: courses } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('subject_id', subjectRow.id)

      if (!courses?.length) return { name, questions: [] }

      const courseIds = courses.map((c) => c.id)

      const { data: chapters } = await supabaseAdmin
        .from('chapters')
        .select('id')
        .in('course_id', courseIds)

      if (!chapters?.length) return { name, questions: [] }

      const chapterIds = chapters.map((c) => c.id)

      const { data: questions } = await supabaseAdmin
        .from('chapter_questions')
        .select('id, question, options, answer_index, explanation')
        .in('chapter_id', chapterIds)

      if (!questions?.length) return { name, questions: [] }

      const shuffled = [...questions].sort(() => Math.random() - 0.5)
      return {
        name,
        questions: shuffled.slice(0, Q_PER_SUBJECT).map((q) => ({
          id:           q.id,
          question:     q.question,
          options:      Array.isArray(q.options) ? q.options : [],
          answer_index: q.answer_index,
          explanation:  q.explanation ?? null,
        })),
      }
    })
  )

  return NextResponse.json({ subjects })
}
