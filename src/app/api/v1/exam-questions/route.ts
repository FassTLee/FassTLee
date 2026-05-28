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

  // 2. For each subject, query chapter_questions by subject_id column
  const subjects = await Promise.all(
    subjectList.map(async ({ id: subjectId, name }) => {
      const { data: questions } = await supabaseAdmin
        .from('chapter_questions')
        .select('id, question, options, answer_index, explanation')
        .eq('subject_id', subjectId)

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
