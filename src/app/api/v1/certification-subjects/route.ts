import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export interface CertSubject {
  id: string
  name: string
  is_required: boolean
  display_order: number
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const certKey     = searchParams.get('certKey')
  const certIdParam = searchParams.get('cert_id')

  if ((!certKey && !certIdParam) || !isSupabaseAdminConfigured) {
    return NextResponse.json({ subjects: [], required: [], optional: [] })
  }

  let certUUID: string | null = certIdParam
  if (!certUUID) {
    const { data: cert } = await supabaseAdmin
      .from('certifications')
      .select('id')
      .eq('key', certKey!)
      .maybeSingle()
    certUUID = cert?.id ?? null
  }

  if (!certUUID) {
    return NextResponse.json({ subjects: [], required: [], optional: [] })
  }

  const { data: rows, error } = await supabaseAdmin
    .from('certification_subjects')
    .select('subject_id, is_required, display_order, subjects(id, name)')
    .eq('certification_id', certUUID)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('[certification-subjects] query error:', error.message)
    return NextResponse.json({ subjects: [], required: [], optional: [] })
  }

  type CertSubjectRow = {
    subject_id:    string
    is_required:   boolean
    display_order: number
    subjects:      { id: string; name: string }[] | { id: string; name: string } | null
  }

  const subjects: CertSubject[] = (rows as CertSubjectRow[])
    .map((r) => {
      const subj = Array.isArray(r.subjects) ? r.subjects[0] : r.subjects
      return {
        id:            r.subject_id,
        name:          subj?.name ?? '',
        is_required:   r.is_required,
        display_order: r.display_order ?? 0,
      }
    })
    .filter((s) => s.name.length > 0)

  const required = subjects.filter((s) => s.is_required).map((s) => s.name)
  const optional = subjects.filter((s) => !s.is_required).map((s) => s.name)

  return NextResponse.json({ subjects, required, optional })
}
