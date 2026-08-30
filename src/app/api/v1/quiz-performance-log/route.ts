import { NextRequest, NextResponse } from 'next/server'
// ── getToken 사용: sendBeacon(Content-Type: text/plain) 환경에서도 인증 가능 (배치3 이탈 flush 대비) ──
import { getToken } from 'next-auth/jwt'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
// question_type은 integer 컬럼 — 문자열 키를 정수 코드로 변환해 저장 (의미 정의: quizLog.ts)
import { questionTypeCode } from '@/lib/quizLog'

export const dynamic = 'force-dynamic'

// 미니퀴즈(슬라이드3) per-attempt 상세 로그 → quiz_performance_logs
// 집계(chapter_stats/question_stats)는 mini-quiz-complete가 별도로 담당 — 여기선 attempt 단건만 기록.
//
// 배치3: 2단계 기록으로 전환 (마지막 카드에서 안 넘어가고 이탈해도 attempt 유실 방지)
//  - mode 'insert'(제출 즉시): attempt 확정 저장(quiz_bridge_time=null), 생성된 row id 반환
//  - mode 'update'(전환/이탈 시): 그 row의 quiz_bridge_time·explanation_viewed만 갱신
export async function POST(req: NextRequest) {
  if (!isSupabaseAdminConfigured) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  try {
    // body를 먼저 파싱 — getToken이 req stream을 소비하기 전에 읽어야 함
    const body = await req.json()
    const {
      mode,
      logId,
      chapterId,
      questionId,
      questionType,
      isCorrect,
      answerGiven,
      responseTime,
      quizBridgeTime,
      afterWrongAction,
      explanationViewed,
      quizEnteredAt,
    } = body

    // body userId를 신뢰하지 않고 token에서 취득 (userId=stableId UUID 우선, sub은 카카오 원본 ID)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
    if (!token) {
      return NextResponse.json({ ok: true, skipped: true })
    }
    const userId = (token.userId as string | undefined) ?? token.sub
    if (!userId) return NextResponse.json({ ok: true, skipped: true })

    // ── mode 'update': 기존 attempt row의 bridge_time / explanation_viewed만 갱신 ──
    if (mode === 'update') {
      if (!logId) {
        return NextResponse.json({ error: 'Missing logId' }, { status: 400 })
      }
      const patch: Record<string, unknown> = {}
      if (typeof quizBridgeTime === 'number') patch.quiz_bridge_time = quizBridgeTime
      if (['explanation', 'retry', 'next', 'exit', 'self_assessed'].includes(afterWrongAction)) {
        patch.after_wrong_action = afterWrongAction
      }
      if (typeof explanationViewed === 'boolean') patch.explanation_viewed = explanationViewed
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ ok: true, skipped: true })
      }
      const { error } = await supabaseAdmin
        .from('quiz_performance_logs')
        .update(patch)
        .eq('id', logId)
        .eq('user_id', userId) // 소유권 확인
      if (error) {
        console.error('[quiz-performance-log] update error:', error)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    // ── 기본(mode 'insert'): 제출 시점 attempt 확정 저장 + row id 반환 ──
    // question_type은 integer NOT NULL 컬럼 — 문자열 키('mini_quiz')를 정수 코드(1)로 변환
    const questionTypeInt = questionTypeCode(questionType)
    if (!chapterId || !questionId || questionTypeInt === undefined) {
      return NextResponse.json({ error: 'Missing or invalid required fields' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('quiz_performance_logs')
      .insert({
        user_id:            userId,
        chapter_id:         chapterId,
        question_id:        questionId,
        question_type:      questionTypeInt,                    // 1 = mini_quiz (quizLog.ts)
        is_correct:         isCorrect ?? null,
        answer_given:       answerGiven ?? null,                // 고른 선지 인덱스(0/1)
        response_time:      responseTime ?? null,               // 진입~제출(초)
        quiz_bridge_time:   quizBridgeTime ?? null,             // 제출 시점엔 null → update로 채움 (P1-15)
        explanation_viewed: explanationViewed ?? null,
        quiz_entered_at:    quizEnteredAt ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[quiz-performance-log] insert error:', error)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data?.id })
  } catch (e) {
    console.error('[quiz-performance-log] error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
