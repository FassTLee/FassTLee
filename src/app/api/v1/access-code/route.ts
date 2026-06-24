import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId  = (session?.user as { id?: string } | undefined)?.id

  if (!userId || !isSupabaseAdminConfigured) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const { code } = await req.json()
  if (!code) return NextResponse.json({ error: '코드를 입력해주세요' }, { status: 400 })

  const upperCode = String(code).toUpperCase().trim()

  // 1. access_codes 테이블에서 유효한 코드 조회
  const { data: accessCode, error: codeError } = await supabaseAdmin
    .from('access_codes')
    .select('*')
    .eq('code', upperCode)
    .eq('is_active', true)
    .single()

  if (codeError || !accessCode) {
    return NextResponse.json({ error: '유효하지 않은 코드입니다' }, { status: 400 })
  }

  // 2. 만료일 확인
  if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
    return NextResponse.json({ error: '만료된 코드입니다' }, { status: 400 })
  }

  // 3. 최대 사용 횟수 확인
  if (accessCode.max_uses && (accessCode.current_uses ?? 0) >= accessCode.max_uses) {
    return NextResponse.json({ error: '이미 소진된 코드입니다' }, { status: 400 })
  }

  // ── 2026-06-24 수정 (P0-9): 코드 이력 보존 + 자동 활성 선택 + 안내 분기 ──

  // 4. 기존 보유 코드 조회 (만료일 비교 + 중복 판별용)
  const { data: ownedRows } = await supabaseAdmin
    .from('user_access_codes')
    .select('code_id, access_codes(code, expires_at)')
    .eq('user_id', userId)

  type OwnedRow = { code_id: string; access_codes: { code: string; expires_at: string | null } | null }
  const owned = (ownedRows ?? []) as unknown as OwnedRow[]

  // 만료일 비교값 (null = 무기한 → 최우선)
  const expVal = (e: string | null | undefined) => (e ? new Date(e).getTime() : Infinity)

  // 처리 전 활성 코드 = 만료일이 가장 늦은 것
  const prevActive = owned.length > 0
    ? owned.reduce((best, cur) =>
        expVal(cur.access_codes?.expires_at) > expVal(best.access_codes?.expires_at) ? cur : best
      )
    : null
  const prevInfo = prevActive?.access_codes
    ? { code: prevActive.access_codes.code, expiresAt: prevActive.access_codes.expires_at ?? null }
    : null

  const enteredInfo = { code: upperCode, expiresAt: accessCode.expires_at ?? null }

  // 5. 동일 코드 중복 → INSERT 없이 거부
  if (owned.some(o => o.code_id === accessCode.id)) {
    return NextResponse.json({
      status: 'duplicate',
      enteredCode: enteredInfo,
      activeCode: prevInfo ?? enteredInfo,
      prevCode: null,
    })
  }

  // 6. user_access_codes INSERT (이력 보존)
  const { error: insertError } = await supabaseAdmin
    .from('user_access_codes')
    .insert({ user_id: userId, code_id: accessCode.id })

  if (insertError) {
    // 23505 = 동일 코드 유니크 충돌 (위 체크와의 race 방어)
    if (insertError.code === '23505') {
      return NextResponse.json({
        status: 'duplicate',
        enteredCode: enteredInfo,
        activeCode: prevInfo ?? enteredInfo,
        prevCode: null,
      })
    }
    console.error('[access-code] insert error:', insertError)
    return NextResponse.json({ error: '코드 등록 중 오류가 발생했습니다' }, { status: 500 })
  }

  // 7. current_uses 증가
  await supabaseAdmin
    .from('access_codes')
    .update({ current_uses: (accessCode.current_uses ?? 0) + 1 })
    .eq('id', accessCode.id)

  // 8. 만료일 비교 → upgraded(더 긴) / kept(더 짧은) 판정
  const isUpgraded = !prevInfo || expVal(enteredInfo.expiresAt) > expVal(prevInfo.expiresAt)
  const status = isUpgraded ? 'upgraded' : 'kept'
  const activeCode = isUpgraded ? enteredInfo : prevInfo!

  // 9. profiles 업데이트 (활성 코드 기준)
  await supabaseAdmin
    .from('profiles')
    .update({ access_code_used: activeCode.code, code_popup_shown: true })
    .eq('id', userId)

  return NextResponse.json({
    status,
    enteredCode: enteredInfo,
    activeCode,
    prevCode: prevInfo,
  })
}
