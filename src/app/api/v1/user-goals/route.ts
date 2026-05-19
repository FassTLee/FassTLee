import { NextRequest, NextResponse } from 'next/server'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getProfileId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('sub', userId)
    .single()
  return data?.id ?? null
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) return NextResponse.json({ goals: [] })
  if (!isSupabaseConfigured) return NextResponse.json({ goals: [] })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ goals: [] })

  const { data } = await supabase
    .from('user_goals')
    .select('id, cert_type, exam_target_date')
    .eq('profile_id', profileId)
    .order('exam_target_date', { ascending: true })

  return NextResponse.json({ goals: data ?? [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { userId, cert_type, exam_target_date } = body
  if (!userId) return NextResponse.json({ ok: true, saved: false })
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })
  if (!cert_type || !exam_target_date) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ ok: true, saved: false })

  const { data, error } = await supabase
    .from('user_goals')
    .insert({ profile_id: profileId, cert_type, exam_target_date })
    .select('id, cert_type, exam_target_date')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, goal: data })
}

export async function DELETE(req: NextRequest) {
  const body = await req.json()
  const { userId, id } = body
  if (!userId) return NextResponse.json({ ok: true })
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true })

  const profileId = await getProfileId(userId)
  if (!profileId) return NextResponse.json({ ok: true })

  await supabase
    .from('user_goals')
    .delete()
    .eq('id', id)
    .eq('profile_id', profileId)

  return NextResponse.json({ ok: true })
}
