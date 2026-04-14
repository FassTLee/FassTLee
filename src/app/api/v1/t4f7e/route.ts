// /api/v1/t4f7e → Test 결과 저장 API (난독화)
// Rate limit: 분당 10회 (middleware에서 처리)

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/crypto'

// POST: 랜딩 테스트 결과 저장
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  }

  // IP 주소 (Rate limit 참조용)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'

  // 이메일 암호화 (개인정보 보호)
  let encryptedEmail: string | null = null
  if (body.email) {
    encryptedEmail = await encrypt(body.email).catch(() => null)
  }

  const { data, error } = await supabase
    .from('landing_test_sessions')
    .insert({
      google_user_id: body.googleUserId ?? null,
      email: encryptedEmail,                // 암호화된 이메일 저장
      name: body.name ?? null,
      score: body.score ?? 0,
      total_questions: body.totalQuestions ?? 5,
      weak_areas: body.weakAreas ?? '',
      answers_json: body.answers ?? null,
      app_download_clicked: body.appDownloadClicked ?? false,
      ip_address: await encrypt(ip).catch(() => 'encrypted'),   // IP도 암호화
    })
    .select('id')
    .single()

  if (error) {
    console.error('[API/test] Supabase error:', error.message)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sessionId: data?.id })
}
