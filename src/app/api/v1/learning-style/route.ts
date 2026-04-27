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
    return NextResponse.json({ learning_style: null, style_tested_at: null })
  }
  const { data } = await supabase
    .from('profiles')
    .select('learning_style, style_tested_at')
    .eq('email', session.user.email)
    .single()
  return NextResponse.json({
    learning_style: data?.learning_style ?? null,
    style_tested_at: data?.style_tested_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { learning_style } = await req.json()
  if (learning_style !== 'memorizer' && learning_style !== 'conceptualizer') {
    return NextResponse.json({ error: 'Invalid learning_style' }, { status: 400 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }
  await supabase
    .from('profiles')
    .update({ learning_style, style_tested_at: new Date().toISOString() })
    .eq('email', session.user.email)
  return NextResponse.json({ ok: true, saved: true })
}
