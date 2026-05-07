'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface QuestionData {
  id: string
  question: string
  options: string[]
  answer_index: number
  explanation: string | null
  difficulty: string | null
}

export interface LessonData {
  chapter: { title: string } | null
  questions: QuestionData[]
  subjectName: string
}

export async function fetchLessonData(chapterId: string): Promise<LessonData> {
  const [{ data: ch }, { data: qs }] = await Promise.all([
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

  return {
    chapter: ch ? { title: ch.title } : null,
    questions: (qs ?? []).map((q) => ({
      id:           q.id,
      question:     q.question,
      options:      q.options,
      answer_index: q.answer_index,
      explanation:  q.explanation ?? null,
      difficulty:   q.difficulty ?? null,
    })),
    subjectName,
  }
}
