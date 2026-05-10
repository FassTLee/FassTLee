import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = token.email as string
  if (!isSupabaseConfigured) return NextResponse.json({ goals: [] })

  const { data } = await supabase
    .from('user_goals')
    .select('id, cert_type, exam_date')
    .eq('email', email)
    .order('exam_date', { ascending: true })

  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = token.email as string
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })

  const { cert_type, exam_date } = await req.json()
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
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const email = token.email as string
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  const { id } = await req.json()
  await supabase
    .from('user_goals')
    .delete()
    .eq('id', id)
    .eq('email', email)

  return NextResponse.json({ ok: true })
}
