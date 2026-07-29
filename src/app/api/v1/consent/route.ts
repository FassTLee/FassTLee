// /api/v1/consent → 가입 동의 기록 API
// - user_consents INSERT + profiles.consent_completed_at UPDATE (service_role)
// - user_consents는 RLS 활성·정책 없음 → anon 불가, 반드시 supabaseAdmin 경유

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

// 약관 시행일 (privacy/page.tsx 시행일과 동일)
const CONSENT_VERSION = '2026-04-14'

type ConsentSource = 'signup' | 'retroactive'

export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  }

  // 1. 로그인 확인 — session.user.id === profiles.id (auth.ts stableId 체계)
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  // 2. body 파싱 + 필수 동의 검증
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }
  const terms   = body.terms   === true
  const privacy = body.privacy === true
  if (!terms || !privacy) {
    return NextResponse.json({ error: '필수 항목에 모두 동의해야 합니다' }, { status: 400 })
  }
  const source: ConsentSource = body.source === 'signup' ? 'signup' : 'retroactive'
  // 마케팅 수신 동의는 현재 미수집 — body.marketing이 와도 무시하고 행을 만들지 않는다.
  // (추후 푸시 알림(A2) 도입 시 별도 취득 예정)

  // 3. 멱등 — 이미 완료된 사용자는 중복 INSERT 없이 조용히 통과
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('consent_completed_at')
    .eq('id', userId)
    .maybeSingle()

  if (profileErr) {
    console.error('[consent] profile 조회 오류:', profileErr)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
  if (!profile) {
    return NextResponse.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
  }
  if (profile.consent_completed_at) {
    // 재클릭 안전 — 이미 동의 완료
    return NextResponse.json({ ok: true, alreadyCompleted: true })
  }

  // 4. user_consents INSERT (terms·privacy 필수 2행만 기록)
  const rows: {
    user_id: string
    consent_type: string
    agreed: boolean
    version: string
    source: ConsentSource
  }[] = [
    { user_id: userId, consent_type: 'terms',   agreed: true, version: CONSENT_VERSION, source },
    { user_id: userId, consent_type: 'privacy', agreed: true, version: CONSENT_VERSION, source },
  ]

  const { error: insertErr } = await supabaseAdmin
    .from('user_consents')
    .insert(rows)

  if (insertErr) {
    console.error('[consent] user_consents INSERT 오류:', insertErr)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  // 5. profiles.consent_completed_at = now() UPDATE (게이트 통과 캐시)
  const { error: updateErr } = await supabaseAdmin
    .from('profiles')
    .update({ consent_completed_at: new Date().toISOString() })
    .eq('id', userId)

  if (updateErr) {
    console.error('[consent] consent_completed_at UPDATE 오류:', updateErr)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, consentCount: rows.length })
}
