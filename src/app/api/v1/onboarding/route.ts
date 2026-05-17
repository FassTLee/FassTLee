import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { gender, age_group, occupation } = await req.json()

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      ...(gender     !== undefined && { gender }),
      ...(age_group  !== undefined && { age_group }),
      ...(occupation !== undefined && { occupation }),
      onboarding_completed: true,
    })
    .eq('id', session.user.id)

  if (error) {
    console.error('[Onboarding] Save error:', error)
    return NextResponse.json({ ok: true, saved: false })
  }

  return NextResponse.json({ ok: true, saved: true })
}
