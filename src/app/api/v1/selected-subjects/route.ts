import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  if (!isSupabaseConfigured) {
    return NextResponse.json({ selected_subjects: [], selected_cert: null, required_subjects: [] })
  }
  const { data } = await supabase
    .from('profiles')
    .select('selected_subjects, selected_cert, required_subjects, additional_subjects')
    .eq('email', email)
    .single()
  return NextResponse.json({
    selected_subjects:   data?.selected_subjects   ?? [],
    selected_cert:       data?.selected_cert       ?? null,
    required_subjects:   data?.required_subjects   ?? [],
    additional_subjects: data?.additional_subjects ?? [],
  })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  const body = await req.json()
  const { selected_subjects, selected_cert, required_subjects, additional_subjects } = body
  if (!Array.isArray(selected_subjects)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }
  await supabase
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
