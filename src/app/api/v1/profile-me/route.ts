import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | undefined)?.id

  // ── 기존 코드 (운영 환경 console.log 제거) ──
  // console.log('[profile-me] userId:', userId)

  if (!userId) {
    return NextResponse.json({ name: null, email: null })
  }

  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ name: null, email: null })
  }

  const { data } = await supabaseAdmin
    .from('profiles')
    .select('name, email, avatar_url, cert_type, selected_cert, exam_target_date, learning_style, code_popup_shown, access_code_used, survey_completed')
    .eq('id', userId)
    .single()

  // ── 기존 코드 (운영 환경 console.log 제거) ──
  // console.log('[profile-me] data:', data, '| error:', error)

  // ── 2026-06-15 수정: 이용코드 만료일 조회 추가 ──
  const { data: codeData } = await supabaseAdmin
    .from('user_access_codes')
    .select('access_codes(expires_at)')
    .eq('user_id', userId)
    .single()

  // cert_id → cert_label 변환 맵
  const CERT_ID_TO_LABEL: Record<string, string> = {
    'health-exercise-manager':       '운동건강관리사',
    'sports-instructor-2':           '2급 생활스포츠지도사',
    'sports-instructor-2-written':   '2급 생활스포츠지도사 필기',
    'sports-instructor-2-practical': '2급 생활스포츠지도사 구술/실기',
    'sports-instructor':             '생활스포츠지도사',
    'exercise-prescriptionist':      '건강운동관리사',
  }
  const rawCertType = data?.cert_type ?? data?.selected_cert ?? null
  const certType = rawCertType
    ? (CERT_ID_TO_LABEL[rawCertType] ?? rawCertType)
    : null

  return NextResponse.json({
    name:          data?.name           ?? null,
    email:         data?.email          ?? null,
    avatarUrl:     data?.avatar_url     ?? null,
    certType,
    examDate:      data?.exam_target_date ?? null,
    learningStyle:    data?.learning_style    ?? null,
    codePopupShown:   data?.code_popup_shown  ?? null,
    accessCodeUsed:   data?.access_code_used  ?? null,
    // ── 2026-06-15 수정: 이용코드 만료일 반환 추가 ──
    codeExpiresAt:    (codeData?.access_codes as { expires_at?: string } | null)?.expires_at ?? null,
    surveyCompleted:  data?.survey_completed  ?? false,
  })
}
