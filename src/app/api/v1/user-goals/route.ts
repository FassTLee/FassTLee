import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSupabaseConfigured) return NextResponse.json({ goals: [] })

  const { data } = await supabase
    .from('user_goals')
    .select('id, cert_type, exam_date')
    .eq('email', session.user.email)
    .order('exam_date', { ascending: true })

  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })

  const { cert_type, exam_date } = await req.json()
  if (!cert_type || !exam_date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabase
    .from('user_goals')
    .insert({ email: session.user.email, cert_type, exam_date })
    .select('id, cert_type, exam_date')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, goal: data })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  const { id } = await req.json()
  await supabase
    .from('user_goals')
    .delete()
    .eq('id', id)
    .eq('email', session.user.email)

  return NextResponse.json({ ok: true })
}
