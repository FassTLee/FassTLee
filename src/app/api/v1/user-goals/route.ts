import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) return NextResponse.json({ goals: [] })
  if (!isSupabaseConfigured) return NextResponse.json({ goals: [] })

  const { data } = await supabase
    .from('user_goals')
    .select('id, cert_type, exam_date')
    .eq('email', email)
    .order('exam_date', { ascending: true })

  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { email, cert_type, exam_date } = body
  if (!email) return NextResponse.json({ ok: true, saved: false })
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })
  if (!cert_type || !exam_date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('user_goals')
    .insert({ email, cert_type, exam_date })
    .select('id, cert_type, exam_date')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, goal: data })
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { email, id } = body
  if (!email) return NextResponse.json({ ok: true })
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  await supabase
    .from('user_goals')
    .delete()
    .eq('id', id)
    .eq('email', email)

  return NextResponse.json({ ok: true })
}
