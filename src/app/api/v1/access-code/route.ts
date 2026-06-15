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

  // 4. user_access_codes INSERT (중복 방지)
  const { error: insertError } = await supabaseAdmin
    .from('user_access_codes')
    .insert({ user_id: userId, code_id: accessCode.id })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: '이미 코드를 사용하셨습니다' }, { status: 400 })
    }
    console.error('[access-code] insert error:', insertError)
    return NextResponse.json({ error: '코드 등록 중 오류가 발생했습니다' }, { status: 500 })
  }

  // 5. profiles 업데이트
  await supabaseAdmin
    .from('profiles')
    .update({ access_code_used: upperCode, code_popup_shown: true })
    .eq('id', userId)

  // 6. current_uses 증가
  await supabaseAdmin
    .from('access_codes')
    .update({ current_uses: (accessCode.current_uses ?? 0) + 1 })
    .eq('id', accessCode.id)

  return NextResponse.json({ success: true })
}
