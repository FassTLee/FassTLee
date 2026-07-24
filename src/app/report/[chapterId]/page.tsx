'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Check, X, ChevronLeft } from 'lucide-react'
import { SignupPromptPopup } from '@/components/common/SignupPromptPopup'
import { InstallPromptBanner, useInstallBannerVisible } from '@/components/common/InstallPromptBanner'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'

const RESULT_KEY  = 'kinepia_test_result'
const SUBJECT_KEY = 'kinepia_current_subject_id'

interface AnswerRecord {
  questionId: string
  question: string
  options: string[]
  answer_index: number[]
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

  const [result, setResult]               = useState<TestResult | null>(null)
  const [lessonStat, setLessonStat]       = useState<LessonStat | null>(null)
  const [nextChapterId, setNextChapterId] = useState<string | null>(null)
  const [subjectId, setSubjectId]         = useState<string | null>(null)
  const [loading, setLoading]             = useState(true)
  const [showSignupPopup, setShowSignupPopup] = useState(false)
  const [accessCodeUsed, setAccessCodeUsed]   = useState<string | null>(null)
  const [showCodePopup, setShowCodePopup]     = useState(false)
  const [codeInput, setCodeInput]             = useState('')
  const [codeError, setCodeError]             = useState<string | null>(null)
  const [codeSubmitting, setCodeSubmitting]   = useState(false)

  // 배너 노출 판정 — 배너 컴포넌트와 동일한 훅을 사용(단일 소스). 코드 팝업과는 배타 마운트이므로
  // 실제 배너 표시 = 판정 통과 && 코드 팝업 미표시. 이 값으로 스크롤 하단 여백을 조건부 적용한다.
  const installBannerShown = useInstallBannerVisible() && !showCodePopup

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
    fetch('/api/v1/profile-me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((pm) => { if (pm?.accessCodeUsed) setAccessCodeUsed(pm.accessCodeUsed) })
      .catch(() => {})
    setLoading(false)
  }

  const fetchNextChapter = async () => {
    const { data: chapter } = await supabase
      .from('chapters').select('course_id, order_index').eq('id', chapterId).single()
    if (!chapter) return
    const { data: siblings } = await supabase
      .from('chapters').select('id, order_index')
      .eq('course_id', chapter.course_id).order('order_index', { ascending: true })
    if (siblings) {
      const idx = siblings.findIndex((c) => c.id === chapterId)
      if (idx !== -1 && idx + 1 < siblings.length) setNextChapterId(siblings[idx + 1].id)
    }
  }

  const handleCodeSubmit = async () => {
    if (!codeInput.trim() || codeSubmitting) return
    setCodeSubmitting(true)
    setCodeError(null)
    try {
      const res  = await fetch('/api/v1/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setCodeError(data.error ?? '오류가 발생했습니다'); return }
      setAccessCodeUsed(codeInput.trim().toUpperCase())
      setShowCodePopup(false)
      setCodeInput('')
      router.push(`/review/${chapterId}`)
    } catch {
      setCodeError('네트워크 오류가 발생했습니다')
    } finally {
      setCodeSubmitting(false)
    }
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
      <div className="flex flex-col items-center py-4 mt-2 mb-2 px-4 bg-white border-b border-[#E5E5E5]">
        <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
        <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />
      </div>

      <div className={`flex-1 overflow-y-auto p-4 ${installBannerShown ? 'pb-60' : 'pb-36'} space-y-4`}>

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

        {/* ─── 문항별 결과 요약 ─── */}
        {result && result.records.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-[#E5E5E5] mt-3">
            <div className="text-[14px] font-bold text-[#1A1A1A] mb-3">📊 문항별 결과</div>
            <div className="grid grid-cols-10 gap-1.5">
              {result.records.map((r, i) => (
                <div
                  key={i}
                  className={`aspect-square rounded-lg flex items-center justify-center text-[11px] font-black ${
                    r.correct
                      ? 'bg-[#639922]/15 text-[#639922]'
                      : 'bg-[#E24B4A]/15 text-[#E24B4A]'
                  }`}
                >
                  {r.correct ? '○' : '✕'}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#F5F5F3]">
              <span className="text-[12px] text-[#639922] font-semibold">
                ✓ 정답 {result.records.filter(r => r.correct).length}개
              </span>
              <span className="text-[12px] text-[#E24B4A] font-semibold">
                ✗ 오답 {result.records.filter(r => !r.correct).length}개
              </span>
            </div>
          </div>
        )}

        {/* ── 전체 정답 배지 ── */}
        {score !== null && wrong.length === 0 && (
          <div className="bg-[#63992210] border border-[#63992230] rounded-2xl p-5 text-center">
            <div className="text-[32px] mb-2">🎉</div>
            <p className="text-[14px] font-bold text-[#639922]">완벽해요! 모두 정답입니다</p>
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] p-4 space-y-2">
        {wrong.length > 0 ? (
          <>
            {/* 오답 있음: 오답노트 primary + 다음챕터/강의실 row */}
            <button
              onClick={() => {
                if (!accessCodeUsed) { setShowCodePopup(true); return }
                router.push(`/review/${chapterId}`)
              }}
              className="w-full py-4 bg-[#1A1A1A] rounded-2xl text-[15px] font-bold text-white"
            >
              오답노트 확인하기
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => nextChapterId
                  ? router.push(`/lesson/${nextChapterId}`)
                  : router.push(subjectId ? `/chapters/${subjectId}` : '/trainer/dashboard?tab=classroom')
                }
                className="flex-1 py-3.5 border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-bold text-[#1A1A1A]"
              >
                다음 챕터 →
              </button>
              <button
                onClick={() => router.push(subjectId ? `/chapters/${subjectId}` : '/trainer/dashboard?tab=classroom')}
                className="flex-1 py-3.5 border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-bold text-[#1A1A1A]"
              >
                강의실로
              </button>
            </div>
          </>
        ) : (
          <>
            {/* 오답 없음: 다음챕터 primary + 강의실 텍스트 링크 */}
            <button
              onClick={() => nextChapterId
                ? router.push(`/lesson/${nextChapterId}`)
                : router.push(subjectId ? `/chapters/${subjectId}` : '/trainer/dashboard?tab=classroom')
              }
              className="w-full py-4 bg-[#00A651] rounded-2xl text-[15px] font-bold text-white"
            >
              다음 챕터 →
            </button>
            <button
              onClick={() => router.push(subjectId ? `/chapters/${subjectId}` : '/trainer/dashboard?tab=classroom')}
              className="w-full py-2 text-[14px] text-[#ADADAD] text-center"
            >
              강의실로
            </button>
          </>
        )}
      </div>

      {/* 비로그인 가입 유도 팝업 (오버레이) */}
      {showSignupPopup && (
        <SignupPromptPopup
          callbackUrl={`/report/${chapterId}`}
          onClose={() => setShowSignupPopup(false)}
        />
      )}

      {/* Android 설치 유도 배너 — 코드 팝업(z-50)과 배타적으로만 노출.
          SignupPromptPopup(비로그인)과는 배너 내부 authenticated 조건으로 이미 배타적. */}
      {!showCodePopup && <InstallPromptBanner />}

      {/* 이용 코드 입력 팝업 */}
      {showCodePopup && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6">
            <div className="text-center mb-5">
              <div className="text-[44px] mb-3">🎁</div>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">Kinepia 무료 이용권</h2>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                코드를 입력하면 6월 30일까지<br />모든 과목을 무료로 이용할 수 있습니다.
              </p>
            </div>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null) }}
              placeholder="코드를 입력하세요"
              className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-2xl text-[15px] font-bold tracking-widest text-center mb-2 focus:outline-none focus:border-[#1A1A1A]"
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            />
            {codeError && (
              <p className="text-[12px] text-[#E24B4A] text-center mb-2">{codeError}</p>
            )}
            <button
              onClick={handleCodeSubmit}
              disabled={!codeInput.trim() || codeSubmitting}
              className="w-full py-3.5 bg-[#1A1A1A] disabled:bg-[#E5E5E5] disabled:text-[#ADADAD] text-white rounded-2xl text-[15px] font-bold mt-1"
            >
              {codeSubmitting ? '확인 중...' : '코드 입력하기'}
            </button>
            <button
              onClick={() => { setShowCodePopup(false); setCodeInput(''); setCodeError(null) }}
              className="w-full py-2.5 mt-2 text-[13px] text-[#ADADAD] text-center"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
