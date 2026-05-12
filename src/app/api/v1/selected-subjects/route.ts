import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ selected_subjects: [], selected_cert: null, required_subjects: [] })
  }

  const userId = session.user.id   // Supabase UUID
  const email  = session.user.email

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ selected_subjects: [], selected_cert: null, required_subjects: [] })
  }

  // UUID가 있으면 id로, 없으면 email로 fallback 조회
  const query = userId
    ? supabaseAdmin.from('profiles').select('selected_subjects, selected_cert, required_subjects, additional_subjects').eq('id', userId)
    : supabaseAdmin.from('profiles').select('selected_subjects, selected_cert, required_subjects, additional_subjects').eq('email', email)

  const { data } = await query.single()

  return NextResponse.json({
    selected_subjects:   data?.selected_subjects   ?? [],
    selected_cert:       data?.selected_cert       ?? null,
    required_subjects:   data?.required_subjects   ?? [],
    additional_subjects: data?.additional_subjects ?? [],
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email  = session.user.email

  const body = await req.json()
  const { selected_subjects, selected_cert, required_subjects, additional_subjects } = body
  if (!Array.isArray(selected_subjects)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        email,
        selected_subjects,
        selected_cert:       selected_cert       ?? null,
        required_subjects:   required_subjects   ?? [],
        additional_subjects: additional_subjects ?? [],
      },
      { onConflict: 'email' }
    )

  return NextResponse.json({ ok: true, saved: true })
}
