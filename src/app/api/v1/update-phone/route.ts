import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET: phone 등록 여부 확인
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ phone: null, registered: false })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ phone: null, registered: false })
  }

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('phone')
    .eq('email', session.user.email)
    .maybeSingle()

  return NextResponse.json({
    phone:      data?.phone ?? null,
    registered: Boolean(data?.phone),
  })
}

// POST: phone 저장
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { phone, provider } = await req.json()
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

  const email = session.user.email

  // 기존 linked_providers, primary_provider 조회
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('linked_providers, primary_provider')
    .eq('email', email)
    .maybeSingle()

  const currentProviders: string[] = existing?.linked_providers ?? []
  const newProviders = currentProviders.includes(provider)
    ? currentProviders
    : [...currentProviders, provider]

  await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        email,
        phone,
        primary_provider: existing?.primary_provider ?? provider,
        linked_providers: newProviders,
      },
      { onConflict: 'email' }
    )

  return NextResponse.json({ ok: true, saved: true })
}
