import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const DEFAULT_CERT_ID = 'feddb13b-91c9-461b-a6d5-a1efb0448f17'
const Q_PER_SUBJECT   = 20

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ subjects: [] })
  }

  const cert_id = new URL(req.url).searchParams.get('cert_id') ?? DEFAULT_CERT_ID

  // 1. certification_subjects JOIN subjects → { id, name }[] ordered by name
  const { data: csRows, error: csError } = await supabaseAdmin
    .from('certification_subjects')
    .select('subject_id, subjects(id, name)')
    .eq('certification_id', cert_id)

  if (csError || !csRows?.length) {
    return NextResponse.json({ subjects: [] })
  }

  type CsRow = {
    subject_id: string
    subjects:   { id: string; name: string } | { id: string; name: string }[] | null
  }

  const subjectList = (csRows as CsRow[])
    .map((r) => {
      const s = Array.isArray(r.subjects) ? r.subjects[0] : r.subjects
      return s ? { id: s.id, name: s.name } : null
    })
    .filter((s): s is { id: string; name: string } => s !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  // 2. For each subject, query chapter_cards by subject_id column (content_type='exam', question_format='multiple_choice')
  const subjects = await Promise.all(
    subjectList.map(async ({ id: subjectId, name }) => {
      // 1) subject_id → course_id
      const { data: courseRows } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('certification_id', cert_id)

      const courseIds = courseRows?.map((c) => c.id) ?? []
      if (!courseIds.length) return { name, questions: [] }

      // 2) course_id → chapter_id
      const { data: chapterRows } = await supabaseAdmin
        .from('chapters')
        .select('id')
        .in('course_id', courseIds)

      const chapterIds = chapterRows?.map((c) => c.id) ?? []
      if (!chapterIds.length) return { name, questions: [] }

      // 3) chapter_id → 문제 조회
      // ── 2026-06-16 수정: P0-2 answer_index 제거 — 클라이언트 정답 노출 차단 (P1-12에서 서버사이드 채점으로 전환 예정) ──
      const { data: questions } = await supabaseAdmin
        .from('chapter_cards')
        .select('id, question, options, explanation, exam_years, star_rating')
        .in('chapter_id', chapterIds)
        // ── 기존 필터 유지하되 answer_index 의존 제거 ──
        .not('exam_years', 'is', null)
        .not('answer_index', 'eq', '[-1]')
        .eq('content_type', 'exam')
        .eq('question_format', 'multiple_choice')

      if (!questions?.length) return { name, questions: [] }

      const shuffled = [...questions].sort(() => Math.random() - 0.5)
      return {
        name,
        questions: shuffled.slice(0, Q_PER_SUBJECT).map((q) => ({
          id:           q.id,
          question:     q.question,
          options:      Array.isArray(q.options) ? q.options : [],
          // ── 기존 코드 (answer_index 제거) ──
          // answer_index: q.answer_index,
          explanation:  q.explanation  ?? null,
          exam_years:   q.exam_years   ?? null,
          star_rating:  q.star_rating  ?? null,
        })),
      }
    })
  )

  return NextResponse.json({ subjects })
}
