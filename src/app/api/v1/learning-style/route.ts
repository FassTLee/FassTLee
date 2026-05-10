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
    return NextResponse.json({ learning_style: null, style_tested_at: null })
  }
  const { data } = await supabase
    .from('profiles')
    .select('learning_style, style_tested_at')
    .eq('email', email)
    .single()
  return NextResponse.json({
    learning_style:  data?.learning_style  ?? null,
    style_tested_at: data?.style_tested_at ?? null,
  })
}

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  const name  = (token.name as string | undefined) ?? null
  const { learning_style } = await req.json()
  if (learning_style !== 'memorizer' && learning_style !== 'conceptualizer') {
    return NextResponse.json({ error: 'Invalid learning_style' }, { status: 400 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }
  await supabase
    .from('profiles')
    .upsert(
      {
        email,
        name,
        learning_style,
        style_tested_at: new Date().toISOString(),
      },
      { onConflict: 'email' }
    )
  return NextResponse.json({ ok: true, saved: true })
}
