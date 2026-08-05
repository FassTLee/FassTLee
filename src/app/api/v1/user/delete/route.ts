// /api/v1/user/delete → 개인정보 삭제 요청 API
// 개인정보보호법 준수 — 사용자 요청 시 프로필 및 연결된 사용자 데이터 삭제

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'

const DB_UNAVAILABLE = NextResponse.json(
  { error: 'Database not configured' },
  { status: 503 }
)

type DeletionRequestIntakeResult = 'deleted' | 'fk_blocked' | 'not_found' | 'partial_error'

async function recordDeletionRequest({
  profileId,
  contactEmail,
  tokenEmail,
  intakeResult,
  processingNote,
}: {
  profileId: string
  contactEmail?: string
  tokenEmail?: string | null
  intakeResult: DeletionRequestIntakeResult
  processingNote?: string
}) {
  const submitted = typeof contactEmail === 'string' ? contactEmail.trim() : ''
  const accountEmail = typeof tokenEmail === 'string' ? tokenEmail.trim() : ''

  // 필드는 세션 이메일로 프리필된다. 빈 값은 "값 없음"이 아니라 명시적 거부이므로
  // token.email로 폴백하지 않는다. 이메일 제공은 선택 항목이다.
  const email = submitted || null
  const emailSource = !submitted
    ? null
    : submitted === accountEmail
      ? 'profile'      // 프리필된 계정 이메일을 그대로 사용
      : 'user_input'   // 사용자가 다른 주소를 입력
  const isCompleted = intakeResult === 'deleted'

  try {
    const { error } = await supabaseAdmin
      .from('deletion_requests')
      .insert({
        profile_id: profileId,
        email,
        status: isCompleted ? 'completed' : 'received',
        intake_result: intakeResult,
        email_source: emailSource,
        processed_at: isCompleted ? new Date().toISOString() : null,
        processing_note: processingNote ?? null,
      })

    if (error) {
      console.error('[GDPR] Failed to record deletion request:', {
        profileId,
        intakeResult,
        errorCode: error.code,
        errorMessage: error.message,
      })
    }
  } catch (err) {
    console.error('[GDPR] Failed to record deletion request:', {
      profileId,
      intakeResult,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSupabaseAdminConfigured) return DB_UNAVAILABLE

  let contactEmail: string | undefined
  try {
    const body = await req.json() as { contactEmail?: unknown }
    contactEmail = typeof body?.contactEmail === 'string' ? body.contactEmail : undefined
  } catch {
    contactEmail = undefined
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const tokenEmail = typeof token?.email === 'string' ? token.email : null
  const profileId = typeof token?.userId === 'string' ? token.userId : null
  if (!profileId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[GDPR] User delete started:', {
      profileId,
      tables: [
        'user_gamification',
        'user_badges',
        'leaderboard',
        'learning_progress',
        'test_results',
        'profiles',
      ],
      requestedAt: new Date().toISOString(),
    })

    // 1. 게이미피케이션 데이터 삭제
    const { error: gamificationError, count: gamificationCount } = await supabaseAdmin
      .from('user_gamification')
      .delete({ count: 'exact' })
      .eq('user_id', profileId)
    // 2. 배지 삭제
    const { error: badgesError, count: badgesCount } = await supabaseAdmin
      .from('user_badges')
      .delete({ count: 'exact' })
      .eq('user_id', profileId)
    // 3. 리더보드 삭제
    const { error: leaderboardError, count: leaderboardCount } = await supabaseAdmin
      .from('leaderboard')
      .delete({ count: 'exact' })
      .eq('user_id', profileId)
    // 4. 학습 진도 삭제
    const { error: progressError, count: progressCount } = await supabaseAdmin
      .from('learning_progress')
      .delete({ count: 'exact' })
      .eq('user_id', profileId)
    // 5. 테스트 결과 삭제
    const { error: testResultsError, count: testResultsCount } = await supabaseAdmin
      .from('test_results')
      .delete({ count: 'exact' })
      .eq('user_id', profileId)
    // 6. 프로필 삭제
    const { error: profileError, count: profileCount } = await supabaseAdmin
      .from('profiles')
      .delete({ count: 'exact' })
      .eq('id', profileId)

    const deleteCounts = {
      user_gamification: gamificationCount ?? 0,
      user_badges: badgesCount ?? 0,
      leaderboard: leaderboardCount ?? 0,
      learning_progress: progressCount ?? 0,
      test_results: testResultsCount ?? 0,
      profiles: profileCount ?? 0,
    }

    console.log('[GDPR] User delete counts:', {
      profileId,
      counts: deleteCounts,
      deletedAt: new Date().toISOString(),
    })

    const deleteErrors = [
      { table: 'user_gamification', error: gamificationError },
      { table: 'user_badges', error: badgesError },
      { table: 'leaderboard', error: leaderboardError },
      { table: 'learning_progress', error: progressError },
      { table: 'test_results', error: testResultsError },
      { table: 'profiles', error: profileError?.code === '23503' ? null : profileError },
    ].filter(({ error }) => error)

    if (deleteErrors.length > 0) {
      console.error('[GDPR] Delete table errors:', deleteErrors)
      await recordDeletionRequest({
        profileId,
        contactEmail,
        tokenEmail,
        intakeResult: 'partial_error',
        processingNote: deleteErrors
          .map(({ table, error }) => `${table}:${error?.code ?? 'unknown'}`)
          .join(', '),
      })
      return NextResponse.json(
        {
          error: 'Deletion failed',
          failedTables: deleteErrors.map(({ table }) => table),
        },
        { status: 500 }
      )
    }

    if (profileError?.code === '23503') {
      console.warn('[GDPR] Profile delete accepted due to FK constraint:', {
        profileId,
        counts: deleteCounts,
        errorCode: profileError.code,
      })
      await recordDeletionRequest({
        profileId,
        contactEmail,
        tokenEmail,
        intakeResult: 'fk_blocked',
      })
      return NextResponse.json(
        {
          ok: true,
          status: 'accepted',
          profileId,
          counts: deleteCounts,
        },
        { status: 202 }
      )
    }

    if (deleteCounts.profiles === 0) {
      console.warn('[GDPR] Profile delete matched no rows:', { profileId, counts: deleteCounts })
      await recordDeletionRequest({
        profileId,
        contactEmail,
        tokenEmail,
        intakeResult: 'not_found',
      })
      return NextResponse.json(
        {
          error: 'Profile not found or already deleted',
          counts: deleteCounts,
        },
        { status: 404 }
      )
    }

    await recordDeletionRequest({
      profileId,
      contactEmail,
      tokenEmail,
      intakeResult: 'deleted',
    })

    return NextResponse.json({
      ok: true,
      message: '계정 삭제 요청이 처리되었습니다. 삭제 범위는 프로필 및 연결된 5개 사용자 데이터 테이블입니다.',
      deletedAt: new Date().toISOString(),
      counts: deleteCounts,
    })
  } catch (err) {
    console.error('[GDPR] Delete error:', err)
    return NextResponse.json({ error: 'Deletion failed' }, { status: 500 })
  }
}
