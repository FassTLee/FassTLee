'use server'

import { supabaseAdmin } from '@/lib/supabaseAdmin'

export interface SlideData {
  id: string
  question: string
  explanation: string | null
  options: string[]
  answer_index: number
  difficulty: string | null
}

export interface LessonData {
  chapterTitle: string
  subjectName: string
  courseDesc: string | null
  slides: SlideData[]
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

  return {
    chapterTitle: ch?.title ?? '',
    subjectName,
    courseDesc,
    slides: (qs ?? []).map((q) => ({
      id:           q.id,
      question:     q.question,
      explanation:  q.explanation ?? null,
      options:      q.options,
      answer_index: q.answer_index,
      difficulty:   q.difficulty ?? null,
    })),
  }
}
