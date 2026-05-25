import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

interface UserCertification {
  id: string
  user_id: string
  cert_id: string
  cert_label: string
  subjects: string[]
  exam_type: string
  is_active: boolean
  order_index: number
  added_at: string
  last_studied_at: string | null
}

// ── GET /api/v1/user-certifications?userId=<uuid> ─────────────────
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ data: [] })
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ data: [] })
  }

  const { data, error } = await supabaseAdmin
    .from('user_certifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('order_index', { ascending: true })

  if (error) {
    console.error('[user-certifications GET] error:', error)
    return NextResponse.json({ data: [] })
  }

  return NextResponse.json({ data: (data ?? []) as UserCertification[] })
}

// ── POST /api/v1/user-certifications ─────────────────────────────
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  let body: {
    userId: string
    cert_id: string
    cert_label: string
    subjects: string[]
    exam_type: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { userId, cert_id, cert_label, subjects, exam_type } = body

  if (!userId || !cert_id) {
    return NextResponse.json({ error: 'userId and cert_id are required' }, { status: 400 })
  }

  // 동일 userId + cert_id + exam_type 중복 확인
  const { data: existing, error: findError } = await supabaseAdmin
    .from('user_certifications')
    .select('id')
    .eq('user_id', userId)
    .eq('cert_id', cert_id)
    .eq('exam_type', exam_type ?? '')
    .maybeSingle()

  if (findError) {
    console.error('[user-certifications POST] find error:', findError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // 이미 존재 → is_active=true + subjects 업데이트
  if (existing) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('user_certifications')
      .update({ is_active: true, subjects: subjects ?? [], cert_label })
      .eq('id', existing.id)
      .select()
      .single()

    if (updateError) {
      console.error('[user-certifications POST] update error:', updateError)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ data: updated as UserCertification })
  }

  // 신규 → is_active=true 개수 확인 (최대 3개)
  const { count, error: countError } = await supabaseAdmin
    .from('user_certifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)

  if (countError) {
    console.error('[user-certifications POST] count error:', countError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if ((count ?? 0) >= 3) {
    return NextResponse.json(
      { error: '최대 3개까지 추가 가능합니다' },
      { status: 400 }
    )
  }

  // INSERT
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('user_certifications')
    .insert({
      user_id:    userId,
      cert_id,
      cert_label,
      subjects:   subjects ?? [],
      exam_type:  exam_type ?? '',
      is_active:  true,
      order_index: count ?? 0,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[user-certifications POST] insert error:', insertError)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ data: inserted as UserCertification })
}
