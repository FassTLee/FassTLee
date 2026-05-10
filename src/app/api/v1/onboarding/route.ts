import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const email = token.email as string
  const name  = (token.name as string | undefined) ?? null

  const { gender, age_group, occupation } = await req.json()

  if (!isSupabaseConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  try {
    await supabase
      .from('profiles')
      .upsert(
        {
          email,
          name,
          gender,
          age_group,
          occupation,
          onboarding_completed: true,
        },
        { onConflict: 'email' }
      )

    return NextResponse.json({ ok: true, saved: true })
  } catch (err) {
    console.error('[Onboarding] Save error:', err)
    return NextResponse.json({ ok: true, saved: false })
  }
}
