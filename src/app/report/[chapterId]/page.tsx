'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { SignupPromptPopup } from '@/components/common/SignupPromptPopup'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'

const RESULT_KEY  = 'kinepia_test_result'
const SUBJECT_KEY = 'kinepia_current_subject_id'

interface AnswerRecord {
  questionId: string
  question: string
  options: string[]
  answer_index: number
  selected: number
  correct: boolean
  explanation: string | null
}

interface TestResult {
  chapterId: string
  records: AnswerRecord[]
}

interface LessonStat {
  avg_score:       number
  total_attempts:  number
  last_attempt_at: string | null
  latest_score?:   number | null
  best_score?:     number | null
  test_attempts?:  number
}

export default function ReportPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string

  const [result, setResult]           = useState<TestResult | null>(null)
  const [lessonStat, setLessonStat]   = useState<LessonStat | null>(null)
  const [nextChapterId, setNextChapterId] = useState<string | null>(null)
  const [subjectId, setSubjectId]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showSignupPopup, setShowSignupPopup] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    // 비로그인: 리다이렉트 대신 팝업 표시 후 페이지 계속 렌더
    if (status === 'unauthenticated') {
      setShowSignupPopup(true)
    }

    const raw = localStorage.getItem(RESULT_KEY)
    // 테스트 결과가 이 챕터 것인지 확인, 없으면 null (리포트 아이콘으로 직접 접근 가능)
    if (raw) {
      const parsed: TestResult = JSON.parse(raw)
      if (parsed.chapterId === chapterId) setResult(parsed)
    }
    setSubjectId(localStorage.getItem(SUBJECT_KEY))
    fetchAll(session?.user?.id ?? null)
  }, [status, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async (userId: string | null) => {
    await Promise.all([fetchLessonStat(userId), fetchNextChapter()])
    setLoading(false)
  }

  const fetchLessonStat = async (userId: string | null) => {
    try {
      const url  = userId ? `/api/v1/report?userId=${encodeURIComponent(userId)}` : '/api/v1/report'
      const res  = await fetch(url)
      const data = await res.json()
      const stat = (data.chapter_stats ?? []).find(
        (s: LessonStat & { chapter_id: string }) => s.chapter_id === chapterId
      )
      if (stat) setLessonStat(stat)
    } catch { /* ignore */ }
  }

  const fetchNextChapter = async () => {
    const { data: chapter } = await supabase
      .from('chapters')
      .select('course_id, order_index')
      .eq('id', chapterId)
      .single()

    if (chapter) {
      const { data: siblings } = await supabase
        .from('chapters')
        .select('id, order_index')
        .eq('course_id', chapter.course_id)
        .order('order_index', { ascending: true })

      if (siblings) {
        const idx = siblings.findIndex((c) => c.id === chapterId)
        if (idx !== -1 && idx + 1 < siblings.length) {
          setNextChapterId(siblings[idx + 1].id)
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 테스트 결과 계산
  const total   = result?.records.length ?? 0
  const correct = result?.records.filter((r) => r.correct).length ?? 0
  const score   = total > 0 ? Math.round((correct / total) * 100) : null
  const wrong   = result?.records.filter((r) => !r.correct) ?? []
  const passed  = score !== null && score >= 60
  // 점수 색상: 80+ 초록 / 60~79 주황 / 60미만 빨강
  const scoreColor = score === null
    ? (passed ? '#7bc629' : '#E24B4A')
    : score >= 80 ? (passed ? '#7bc629' : '#639922')
    : score >= 60 ? '#F5A623'
    : '#E24B4A'

  // test_attempts < 1 이고 방금 테스트 결과도 없으면 접근 차단
  const hasTestData = result !== null || (lessonStat !== null && (lessonStat.test_attempts ?? 0) >= 1)

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button
          onClick={() => subjectId ? router.push(`/chapters/${subjectId}`) : router.push('/trainer/dashboard')}
          className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3"
        >
          <ChevronLeft size={16} /> 챕터 목록
        </button>
        <h1 className="text-[20px] font-black text-[#1A1A1A]">학습 리포트</h1>
      </div>

      {/* 광고 배너 — 헤더 바로 아래 */}
      <div className="flex justify-center bg-white border-b border-[#E5E5E5] py-2">
        <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-36 space-y-4">

        {!hasTestData && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="text-[40px] mb-3">📋</div>
            <p className="text-[15px] font-bold text-[#1A1A1A] mb-2">아직 테스트를 응시하지 않았어요</p>
            <p className="text-[13px] text-[#6B6B6B]">챕터 학습 후 테스트를 완료하면 리포트를 확인할 수 있어요.</p>
          </div>
        )}

        {/* ── 테스트 점수 카드 ── */}
        {score !== null ? (
          <div className={`rounded-2xl p-6 text-center ${passed ? 'bg-[#1A1A1A]' : 'bg-white border border-[#E5E5E5]'}`}>
            <p className={`text-[12px] font-bold mb-2 ${passed ? 'text-white/50' : 'text-[#ADADAD]'}`}>테스트 결과</p>
            <div className="text-[48px] font-black mb-1" style={{ color: scoreColor }}>
              {score}점
            </div>
            <div className={`text-[14px] font-semibold mb-3 ${passed ? 'text-white/60' : 'text-[#ADADAD]'}`}>
              {correct} / {total} 문제 정답
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold ${
              passed ? 'bg-[#639922]/20 text-[#7bc629]' : 'bg-[#E24B4A]/10 text-[#E24B4A]'
            }`}>
              {passed ? <><Check size={13} /> 통과</> : <><X size={13} /> 재도전 권장</>}
            </div>
          </div>
        ) : lessonStat && (lessonStat.test_attempts ?? lessonStat.total_attempts) > 0 ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-center">
            <p className="text-[12px] text-[#ADADAD] mb-1">최고 점수</p>
            <p className="text-[40px] font-black text-[#1A1A1A]">{lessonStat.best_score ?? lessonStat.avg_score}점</p>
            <p className="text-[12px] text-[#ADADAD] mt-1">{lessonStat.test_attempts ?? lessonStat.total_attempts}회 응시</p>
          </div>
        ) : null}

        {/* ── 상세 데이터 없음 안내 (이전 응시 기록 직접 접근 시) ── */}
        {!result && hasTestData && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5 text-center">
            <div className="text-[28px] mb-2">📂</div>
            <p className="text-[14px] font-bold text-[#1A1A1A] mb-1">
              이전 응시 기록의 상세 데이터가 없습니다
            </p>
            <p className="text-[12px] text-[#6B6B6B] leading-relaxed">
              다음 응시부터 상세 리포트가 제공됩니다.
            </p>
          </div>
        )}

        {/* ── 문항별 ○/✕ ── */}
        {result && result.records.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-3">문항별 결과</p>
            <div className="flex flex-wrap gap-2">
              {result.records.map((r, i) => (
                <div
                  key={r.questionId}
                  className={`flex flex-col items-center gap-0.5 w-10 py-1 rounded-xl ${
                    r.correct ? 'bg-[#63992210]' : 'bg-[#E24B4A10]'
                  }`}
                >
                  <span className="text-[10px] font-semibold text-[#ADADAD]">Q{i + 1}</span>
                  {r.correct
                    ? <Check size={16} className="text-[#639922]" />
                    : <X    size={16} className="text-[#E24B4A]" />
                  }
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── 오답노트 ── */}
        {wrong.length > 0 ? (
          <div>
            <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider px-1 mb-2">
              오답노트 ({wrong.length}문제)
            </p>
            <div className="space-y-3">
              {wrong.map((r) => (
                <div key={r.questionId} className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
                  <div className="flex items-start gap-2 mb-3">
                    <X size={14} className="text-[#E24B4A] mt-0.5 flex-shrink-0" />
                    <p className="text-[13px] font-semibold text-[#1A1A1A]">{r.question}</p>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {r.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`px-3 py-2 rounded-xl text-[12px] ${
                          oi === r.answer_index
                            ? 'bg-[#63992215] text-[#639922] font-semibold'
                            : oi === r.selected
                            ? 'bg-[#E24B4A10] text-[#E24B4A] line-through'
                            : 'text-[#ADADAD]'
                        }`}
                      >
                        {opt}
                      </div>
                    ))}
                  </div>
                  {r.explanation && (
                    <div className="bg-[#F5F5F3] rounded-xl p-3">
                      <p className="text-[11px] font-bold text-[#ADADAD] mb-1">해설</p>
                      <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{r.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : score !== null && wrong.length === 0 && (
          <div className="bg-[#63992210] border border-[#63992230] rounded-2xl p-5 text-center">
            <div className="text-[32px] mb-2">🎉</div>
            <p className="text-[14px] font-bold text-[#639922]">완벽해요! 모두 정답입니다</p>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5]">
        <div className="flex gap-3 p-4">
          <button
            onClick={() => router.back()}
            className="flex-1 py-4 border-2 border-[#E5E5E5] rounded-2xl text-[15px] font-bold text-[#1A1A1A]"
          >
            강의실로 돌아가기
          </button>
          <button
            onClick={() => router.push(`/review/${chapterId}`)}
            className="flex-1 py-4 bg-[#1A1A1A] rounded-2xl text-[15px] font-bold text-white"
          >
            오답노트 보기
          </button>
        </div>
      </div>

      {/* 비로그인 가입 유도 팝업 (오버레이) */}
      {showSignupPopup && (
        <SignupPromptPopup
          callbackUrl={`/report/${chapterId}`}
          onClose={() => setShowSignupPopup(false)}
        />
      )}
    </div>
  )
}
