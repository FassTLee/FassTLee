import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured) {
    return NextResponse.json({ exam_target_date: null, region: null, daily_study_hours: null })
  }

  const { data } = await supabase
    .from('profiles')
    .select('exam_target_date, region, daily_study_hours')
    .eq('email', session.user.email)
    .single()

  return NextResponse.json({
    exam_target_date:  data?.exam_target_date  ?? null,
    region:            data?.region            ?? null,
    daily_study_hours: data?.daily_study_hours ?? null,
  })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseConfigured) return NextResponse.json({ ok: true, saved: false })

  const body = await req.json()
  const { exam_target_date, region, daily_study_hours } = body

  await supabase.from('profiles').upsert(
    {
      email:             session.user.email,
      exam_target_date:  exam_target_date  ?? null,
      region:            region            ?? null,
      daily_study_hours: daily_study_hours ?? null,
    },
    { onConflict: 'email' }
  )

  return NextResponse.json({ ok: true, saved: true })
}
