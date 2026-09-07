import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import { logUserEvent } from '@/lib/eventLog'

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

// ── GET /api/v1/user-certifications ────────────────────────────────
export async function GET() {
  // ── 2026-06-16 수정: P0-1 인증 추가 — IDOR 보안 이슈 수정 ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

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

  // ── 2026-06-16 수정: P0-1 인증 추가 ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let body: {
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

  const { cert_id, cert_label, subjects, exam_type } = body

  if (!cert_id) {
    return NextResponse.json({ error: 'cert_id is required' }, { status: 400 })
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

    void logUserEvent({
      userId,
      eventType: 'cert_reactivated',
      meta: {
        cert_id,
        cert_label,
        exam_type,
        subjects_count: (subjects ?? []).length,
      },
    })

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

  void logUserEvent({
    userId,
    eventType: 'cert_added',
    meta: {
      cert_id,
      cert_label,
      exam_type,
      subjects_count: (subjects ?? []).length,
      order_index: count ?? 0,
    },
  })

  return NextResponse.json({ data: inserted as UserCertification })
}

// ── 2026-06-13 추가: order_index 일괄 업데이트 (supabaseAdmin 사용) ──
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const { certOrder, subjectOrders } = await req.json()
  if (!Array.isArray(certOrder)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }
  const updates = certOrder.map((certId: string, idx: number) =>
    supabaseAdmin
      .from('user_certifications')
      .update({ order_index: idx })
      .eq('cert_id', certId)
      .eq('user_id', userId)
  )
  const results = await Promise.all(updates)
  const failed = results.filter(r => r.error)
  if (failed.length > 0) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  // ── 2026-06-24 추가: 과목(subjects) 재정렬 순서 DB 반영 ──
  // 안전장치: 기존 subjects와 동일한 원소 집합일 때만 update (순서 변경만 허용)
  if (subjectOrders && typeof subjectOrders === 'object') {
    const { data: existingCerts, error: fetchError } = await supabaseAdmin
      .from('user_certifications')
      .select('cert_id, subjects')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (fetchError) {
      console.error('[user-certifications PUT] subjects fetch error:', fetchError)
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }

    // 순서 무관 집합 동일성 비교 (원소 추가/삭제 없이 순서만 바뀐 경우에만 허용)
    const sameSet = (a: string[], b: string[]) => {
      if (a.length !== b.length) return false
      const sortedA = [...a].sort()
      const sortedB = [...b].sort()
      return sortedA.every((v, i) => v === sortedB[i])
    }

    const subjectUpdates = (existingCerts ?? [])
      .map((row: { cert_id: string; subjects: string[] }) => {
        const newOrder = subjectOrders[row.cert_id]
        // 빈 배열 / 미존재 / 집합 불일치 → skip (순서 변경만 허용)
        if (!Array.isArray(newOrder) || newOrder.length === 0) return null
        if (!sameSet(row.subjects ?? [], newOrder)) return null
        return supabaseAdmin
          .from('user_certifications')
          .update({ subjects: newOrder })
          .eq('cert_id', row.cert_id)
          .eq('user_id', userId)
      })
      .filter((u): u is NonNullable<typeof u> => u !== null)

    const subjectResults = await Promise.all(subjectUpdates)
    if (subjectResults.some(r => r.error)) {
      return NextResponse.json({ error: 'Update failed' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}

// ── PATCH /api/v1/user-certifications — 제거 (is_active = false) ──
export async function PATCH(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  // ── 2026-06-16 수정: P0-1 인증 추가 ──
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id

  let body: { certId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { certId } = body
  if (!certId) {
    return NextResponse.json({ error: 'certId is required' }, { status: 400 })
  }

  const { data: deactivatedCert, error } = await supabaseAdmin
    .from('user_certifications')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('id', certId)
    .select('cert_id, cert_label')
    .maybeSingle()

  if (error) {
    console.error('[user-certifications PATCH] error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  void logUserEvent({
    userId,
    eventType: 'cert_deactivated',
    meta: {
      user_cert_row_id: certId,
      cert_id: deactivatedCert?.cert_id ?? null,
      cert_label: deactivatedCert?.cert_label ?? null,
    },
  })

  return NextResponse.json({ success: true })
}
