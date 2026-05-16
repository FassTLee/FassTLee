import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// GET: phone 등록 여부 확인
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ phone: null, registered: false })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ phone: null, registered: false })
  }

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('phone')
    .eq('id', session.user.id)
    .maybeSingle()

  return NextResponse.json({
    phone:      data?.phone ?? null,
    registered: Boolean(data?.phone),
  })
}

// POST: phone 저장
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { phone, provider } = await req.json()
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

  // 하이픈 등 비숫자 제거 후 저장
  const digitsOnly = phone.replace(/\D/g, '')
  if (digitsOnly.length < 10) {
    return NextResponse.json({ error: 'invalid phone number' }, { status: 400 })
  }

  const userId = session.user.id

  // 기존 linked_providers, primary_provider 조회
  const { data: existing } = await supabaseAdmin
    .from('profiles')
    .select('linked_providers, primary_provider')
    .eq('id', userId)
    .maybeSingle()

  const currentProviders: string[] = existing?.linked_providers ?? []
  const newProviders = currentProviders.includes(provider)
    ? currentProviders
    : [...currentProviders, provider]

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      phone:            digitsOnly,
      primary_provider: existing?.primary_provider ?? provider,
      linked_providers: newProviders,
    })
    .eq('id', userId)

  if (error) {
    console.error('[update-phone] Supabase error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, saved: true })
}
