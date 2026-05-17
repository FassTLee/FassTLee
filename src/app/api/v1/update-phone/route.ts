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

// POST: phone 저장 — phone 컬럼만 업데이트
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ ok: true, saved: false })
  }

  const { phone } = await req.json()
  if (!phone) return NextResponse.json({ error: 'phone required' }, { status: 400 })

  await supabaseAdmin
    .from('profiles')
    .update({ phone })
    .eq('id', session.user.id)

  return NextResponse.json({ ok: true, saved: true })
}
