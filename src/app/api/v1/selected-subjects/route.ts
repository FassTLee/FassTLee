import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ selected_subjects: [] })
  }
  const { data } = await supabase
    .from('profiles')
    .select('selected_subjects')
    .eq('email', session.user.email)
    .single()
  return NextResponse.json({ selected_subjects: data?.selected_subjects ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { selected_subjects } = await req.json()
  if (!Array.isArray(selected_subjects)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }
  await supabase
    .from('profiles')
    .upsert(
      { email: session.user.email, selected_subjects },
      { onConflict: 'email' }
    )
  return NextResponse.json({ ok: true, saved: true })
}
