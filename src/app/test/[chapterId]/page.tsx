'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { track } from '@vercel/analytics'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'

const RESULT_KEY = 'kinepia_test_result'
const CERT_KEY   = 'kinepia_selected_cert'

const CERT_LABELS: Record<string, string> = {
  'exercise-prescriptionist': '건강운동관리사',
  'sports-instructor-2':     '2급 생활스포츠지도사',
  'sports-instructor':       '생활스포츠지도사',
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

/** Remove leading numeric/alpha prefixes. Keeps circled numbers ①②③④⑤ intact. */
function cleanOption(opt: string | null | undefined): string {
  if (!opt) return ''
  return opt
    .replace(/^\s*[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
    .replace(/^\s*\d+[.)、]\s*/, '')
    .replace(/^\s*[A-Da-d][.)]\s*/, '')
    .trim()
}

// ── 2026-06-16 수정: P0-3 answer_index는 서버 API에서 더 이상 내려오지 않음 (explanation은 복구됨) ──
interface Question {
  id: string
  question: string
  options: string[]
  explanation: string | null
  image_url: string | null
  reference_text: string | null
  content_type: string | null
  question_format: string | null
  exam_years: number[] | null
  star_rating: number | null
}

export default function TestPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useParams()
  const chapterId = params.chapterId as string
  const searchParams = useSearchParams()
  const certId = searchParams.get('certId')

  const [questions, setQuestions]         = useState<Question[]>([])
  const [current, setCurrent]             = useState(0)
  const [selected, setSelected]           = useState<number | null>(null)
  const [answers, setAnswers]             = useState<Record<number, number>>({})
  const [showReview, setShowReview]       = useState(false)
  const [loading, setLoading]             = useState(true)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [certLabel, setCertLabel]         = useState('')
  const [reportUrl, setReportUrl]         = useState<string | null>(null)
  const [countdown, setCountdown]         = useState(3)
  const [userAnswers, setUserAnswers]         = useState<Record<string, string>>({})
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set())
  const [sessionId, setSessionId] = useState<string | null>(null)

  // ── 2026-06-16 수정: 이탈 시 exit 누락 방지 — sendBeacon 추가 ──
  useEffect(() => {
    if (!sessionId || !session?.user?.id) return
    const handleUnload = () => {
      navigator.sendBeacon(
        '/api/v1/chapter-session-log',
        JSON.stringify({
          chapterId,
          action:      'exit',
          sessionId,
          isCompleted: false,
          exitPoint:   'unload',
          pageType:    'test',
        })
      )
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [sessionId, session?.user?.id, chapterId])

  // ── 2026-06-16 수정: 브라우저 뒤로가기 감지 → 이탈 확인 팝업 표시 ──
  useEffect(() => {
    if (!questions.length) return
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault()
      history.pushState(null, '', window.location.href)
      setShowExitConfirm(true)
    }
    history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [questions.length])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
    const cert = localStorage.getItem(CERT_KEY)
    if (cert && CERT_LABELS[cert]) setCertLabel(CERT_LABELS[cert])
    fetchQuestions()
  }, [status, chapterId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 챕터 테스트 진입 로깅
  useEffect(() => {
    if (!session?.user?.id || !chapterId) return
    fetch('/api/v1/chapter-session-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session.user.id,
        chapterId,
        action: 'enter',
      }),
    })
      .then((r) => r.json())
      .then((data) => { if (data.sessionId) setSessionId(data.sessionId) })
      .catch(() => {})
  }, [session?.user?.id, chapterId])

  // 전면 광고 카운트다운
  useEffect(() => {
    if (!reportUrl) return
    if (countdown <= 0) { router.replace(reportUrl); return }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [reportUrl, countdown]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 2026-06-16 수정: P0-3 Supabase 직접 호출 → API 전환 (answer_index 클라이언트 노출 차단) ──
  const fetchQuestions = async () => {
    const res = await fetch(`/api/v1/chapter-test?chapterId=${chapterId}`)
    if (!res.ok) { setLoading(false); return }
    const { basic, oral }: { basic: Question[]; oral: Question[] } = await res.json()
    const basicQ = shuffle(basic ?? []).slice(0, 5)
    const oralQ  = shuffle(oral  ?? []).slice(0, 5)
    setQuestions([...basicQ, ...oralQ])
    track('chapter_test_started', { chapterId })
    setLoading(false)
  }

  const handleNext = () => {
    if (selected === null) return
    const nextAnswers = { ...answers, [current]: selected }
    setAnswers(nextAnswers)

    if (current + 1 >= questions.length) {
      setShowReview(true)
    } else {
      setCurrent(current + 1)
      setSelected(nextAnswers[current + 1] ?? null)
    }
  }

  const handlePrev = () => {
    if (current === 0) return
    if (selected !== null) setAnswers((prev) => ({ ...prev, [current]: selected }))
    const prevIdx = current - 1
    setCurrent(prevIdx)
    setSelected(answers[prevIdx] ?? null)
  }

  // ── 2026-06-25 수정: P1-12 서버사이드 채점 — test-complete await 후 scoredRecords 저장 ──
  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)

    // 클라이언트는 selected만 전송 (정답/채점은 서버가 수행)
    const finalRecords = questions.map((q, idx) => ({
      questionId: q.id,
      selected:   answers[idx] ?? -1,
      user_answer: q.question_format === 'short_answer' ? (userAnswers[q.id] ?? '') : '',
      content_type: q.content_type,
      question_format: q.question_format,
    }))

    track('chapter_test_completed', { chapterId })

    // 1. 챕터 테스트 완료 로깅 (fire-and-forget, 채점과 무관)
    if (sessionId) {
      fetch('/api/v1/chapter-session-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          action: 'exit',
          sessionId,
          isCompleted: true,
          exitPoint: 'test_submit',
        }),
      }).catch(() => {})
    }

    // 2. 서버사이드 채점 (await) → scoredRecords로 localStorage 저장
    try {
      const res = await fetch('/api/v1/test-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId,
          subjectId: localStorage.getItem('kinepia_current_subject_id') ?? '',
          records: finalRecords,
          certId,
        }),
      })
      const data = await res.json()
      if (res.ok && Array.isArray(data?.scoredRecords)) {
        localStorage.setItem(RESULT_KEY, JSON.stringify({ chapterId, records: data.scoredRecords }))
      } else {
        throw new Error('scoring response invalid')
      }
    } catch (err) {
      // 채점 실패 시 fallback — 최소한 review 진입은 가능하도록 클라이언트 records 저장
      console.error('[test-complete] scoring failed, fallback to local records', err)
      localStorage.setItem(RESULT_KEY, JSON.stringify({ chapterId, records: finalRecords, userAnswers }))
    }

    // 3. 챕터 1 테스트 완료 시 코드 팝업 트리거
    if (session) {
      const isFirstChapter = localStorage.getItem('kinepia_code_popup_triggered') !== 'true'
      if (isFirstChapter) {
        localStorage.setItem('kinepia_code_popup_triggered', 'true')
        // profile-me의 codePopupShown 확인 후 미입력 시 팝업 표시
        fetch('/api/v1/profile-me', { cache: 'no-store' })
          .then((r) => r.json())
          .then((pm) => {
            if (pm.codePopupShown === false) {
              sessionStorage.setItem('kinepia_show_code_popup', 'true')
            }
          })
          .catch(() => {})
      }
    }

    // 4. 로그인 여부에 따라 이동 처리
    if (session) {
      setReportUrl(`/report/${chapterId}`)   // → 광고 화면 먼저 표시 후 이동
    } else {
      router.replace(`/report/${chapterId}`) // → 바로 리포트 이동
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 테스트 완료 후 전면 광고 화면
  if (reportUrl) {
    return (
      <div className="min-h-screen bg-[#1A1A1A] flex flex-col items-center justify-center p-6 gap-6">
        <p className="text-[13px] text-white/50">잠시 후 결과가 표시됩니다</p>
        <div className="rounded-2xl overflow-hidden bg-white flex items-center justify-center" style={{ width: 300, height: 250 }}>
          <KakaoAdFit unit="DAN-lIQXmkoBNuojGX5A" width={300} height={250} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <p className="text-[14px] text-white/70">{countdown}초 후 자동으로 이동합니다</p>
          <button
            onClick={() => router.replace(reportUrl)}
            className="px-6 py-2.5 rounded-full border border-white/30 text-[13px] text-white/80"
          >
            바로 이동
          </button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-[16px] font-bold text-[#1A1A1A] mb-2">등록된 문제가 없습니다</p>
        <button onClick={() => router.back()} className="text-[14px] text-[#00A651]">← 돌아가기</button>
      </div>
    )
  }

  // 검토 화면
  if (showReview) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
        <div className="bg-white border-b border-[#E5E5E5] px-5 pt-10 pb-3 flex items-center gap-3">
          <button onClick={() => setShowReview(false)} className="p-1">
            <ChevronLeft size={20} className="text-[#1A1A1A]" />
          </button>
          <span className="text-[15px] font-bold text-[#1A1A1A]">내 답 확인</span>
        </div>
        <div className="flex-1 overflow-y-auto p-5 pb-48">
          {questions.map((qItem, idx) => (
            <div key={idx} className="border border-[#E5E5E5] rounded-2xl p-4 mb-3 bg-white">
              <p className="text-[11px] text-[#ADADAD] mb-1">{idx + 1}번 문제</p>
              <p className="text-[13px] font-medium text-[#1A1A1A] mb-2 line-clamp-2">{qItem.question}</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#ADADAD]">내 답:</span>
                {qItem.question_format === 'short_answer' ? (
                  <span className="text-[12px] text-[#1A1A1A]">
                    {userAnswers[qItem.id]?.trim()
                      ? userAnswers[qItem.id]
                      : <span className="text-[#FF3B30]">미답변</span>}
                  </span>
                ) : (
                  answers[idx] !== undefined ? (
                    <span className="text-[12px] font-bold text-[#1A1A1A]">
                      {cleanOption(qItem.options[answers[idx]])}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#FF3B30]">미답변</span>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5] space-y-2">
          <button
            onClick={() => {
              const firstUnanswered = questions.findIndex((_, i) => answers[i] === undefined)
              const target = firstUnanswered >= 0 ? firstUnanswered : 0
              setCurrent(target)
              setSelected(answers[target] ?? null)
              setShowReview(false)
            }}
            disabled={submitting}
            className="w-full py-3 rounded-2xl border border-[#E5E5E5] text-[14px] font-bold text-[#1A1A1A] disabled:opacity-60"
          >
            다시 검토하기
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-[#00A651] text-white text-[14px] font-bold disabled:opacity-60"
          >
            제출하기
          </button>
        </div>
      </div>
    )
  }

  const q        = questions[current]
  const isOral   = q.question_format === 'short_answer'
  const progress = ((current + 1) / questions.length) * 100
  // 하단 버튼 비활성 조건
  const isNextDisabled = selected === null || (isOral && !revealedAnswers.has(q.id))

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* Progress bar */}
      <div className="h-1 bg-[#E5E5E5]">
        <div className="h-full bg-[#00A651] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>

      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-10 pb-3 flex items-center gap-3">
        <button onClick={() => setShowExitConfirm(true)} className="p-1">
          <ChevronLeft size={20} className="text-[#1A1A1A]" />
        </button>
        <span className="text-[13px] text-[#ADADAD] flex-1">{current + 1} / {questions.length}</span>
        {isOral && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A]">
            주관식
          </span>
        )}
        {!isOral && certLabel && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#1A1A1A]/10 text-[#1A1A1A]">
            {certLabel}
          </span>
        )}
      </div>

      {/* Exit confirm popup */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 space-y-4">
            <h2 className="text-[17px] font-black text-[#1A1A1A] text-center">테스트를 중단하시겠습니까?</h2>
            <p className="text-[13px] text-[#6B6B6B] text-center">진행 내용이 저장되지 않습니다.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] font-semibold text-[#1A1A1A]"
              >
                계속하기
              </button>
              <button
                // ── 기존 코드 ──
                // onClick={() => router.push(`/lesson/${chapterId}`)}
                // ── 2026-06-16 수정: exit 로그 기록 + 챕터 목록으로 이동 ──
                onClick={async () => {
                  if (sessionId) {
                    await fetch('/api/v1/chapter-session-log', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        chapterId,
                        action:      'exit',
                        sessionId,
                        isCompleted: false,
                        exitPoint:   'user_exit',
                        pageType:    'test',
                      }),
                    }).catch(() => {})
                  }
                  // ── 더미 히스토리 엔트리 제거 후 이동 ──
                  const subjectId = localStorage.getItem('kinepia_current_subject_id')
                  const target = subjectId ? `/chapters/${subjectId}` : '/trainer/dashboard'
                  history.replaceState(null, '', target)
                  router.replace(target)
                }}
                className="flex-1 py-3 rounded-xl bg-[#E24B4A] text-white text-[14px] font-bold"
              >
                나가기
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 pb-36">
        {/* 지문 */}
        <div className="mb-4">
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">Q{current + 1}</p>
          {isOral && (
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {q.star_rating === 5 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FAECE7', color: '#993C1D' }}>
                  🔥 필수 학습
                </span>
              )}
              {q.star_rating === 4 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FAEEDA', color: '#854F0B' }}>
                  ⭐ 단골 출제
                </span>
              )}
              {q.exam_years && q.exam_years.length > 0 && (
                <span className="text-[11px] text-[#5F5E5A]">
                  출제 [{q.exam_years.join(', ')}]
                </span>
              )}
            </div>
          )}
          <p className="text-[17px] font-bold text-[#1A1A1A] leading-snug">{q.question}</p>
        </div>

        {/* 보기 (reference_text) */}
        {q.reference_text?.trim() && (
          <div className="mb-4 bg-[#F5F5F3] border border-[#E5E5E5] rounded-2xl p-4">
            <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">보기</p>
            <p className="text-[14px] text-[#1A1A1A] leading-relaxed whitespace-pre-line">{q.reference_text}</p>
          </div>
        )}

        {/* 그림 (image_url) */}
        {q.image_url?.trim() && (
          <div className="mb-4 rounded-2xl overflow-hidden border border-[#E5E5E5]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={q.image_url}
              alt="문제 이미지"
              className="w-full object-contain"
              style={{ maxHeight: '260px' }}
            />
          </div>
        )}

        {/* ── 주관식(oral) UI ── */}
        {isOral ? (
          <div className="space-y-3">
            {!revealedAnswers.has(q.id) ? (
              <>
                <textarea
                  value={userAnswers[q.id] ?? ''}
                  onChange={(e) => setUserAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="답변을 입력하세요..."
                  rows={4}
                  className="w-full p-3 mt-3 border border-[#E5E5E5] rounded-xl text-[14px] resize-none focus:outline-none focus:border-[#1A1A1A]"
                />
                <button
                  onClick={() => setRevealedAnswers(prev => { const s = new Set(prev); s.add(q.id); return s })}
                  disabled={!userAnswers[q.id]?.trim()}
                  className="w-full py-3 mt-2 bg-[#1A1A1A] disabled:bg-[#E5E5E5] disabled:text-[#ADADAD] text-white rounded-xl text-[14px] font-bold"
                >
                  모범답안 확인
                </button>
              </>
            ) : (
              <>
                {/* 내 답변 */}
                <div className="bg-[#F5F5F3] rounded-xl p-3 mb-3">
                  <p className="text-[10px] font-bold text-[#ADADAD] mb-1">내 답변</p>
                  <p className="text-[13px] text-[#1A1A1A] leading-relaxed whitespace-pre-wrap">
                    {userAnswers[q.id]}
                  </p>
                </div>
                {/* 모범답안 */}
                <div className="bg-[#00A651]/10 border border-[#00A651]/20 rounded-xl p-3 mb-3">
                  <p className="text-[10px] font-bold text-[#00A651] mb-1">모범답안</p>
                  <p className="text-[13px] text-[#1A1A1A] leading-relaxed">{q.explanation}</p>
                </div>
                {/* 자기평가 버튼 */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelected(0)}
                    className={`flex-1 py-3 rounded-xl text-[14px] font-bold transition-all ${
                      selected === 0 ? 'bg-[#00A651] text-white' : 'bg-[#00A651]/10 text-[#00A651]'
                    }`}
                  >
                    알았다 ✓
                  </button>
                  <button
                    onClick={() => setSelected(1)}
                    className={`flex-1 py-3 rounded-xl text-[14px] font-bold transition-all ${
                      selected === 1 ? 'bg-[#E24B4A] text-white' : 'bg-[#F5F5F3] text-[#1A1A1A]'
                    }`}
                  >
                    오답노트에 저장
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* ── 4지선다(basic) UI ── */
          <div>
            {q.options.map((opt, i) => (
              <div
                key={i}
                className="flex items-center gap-[10px] mb-2 cursor-pointer"
                onClick={() => setSelected(i)}
              >
                {/* 원형 번호 뱃지 */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-medium flex-shrink-0 transition-colors ${
                  selected === i
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-white border border-[#D0D0D0] text-[#888]'
                }`}>
                  {i + 1}
                </div>
                {/* 보기 텍스트 박스 */}
                <div className={`flex-1 px-4 py-[11px] rounded-2xl text-[13px] text-left transition-colors ${
                  selected === i
                    ? 'border-[1.5px] border-[#00A651] bg-[#f0fbf4] text-[#1A1A1A]'
                    : 'border-[0.5px] border-[#E5E5E5] bg-white text-[#1A1A1A]'
                } border`}>
                  {cleanOption(opt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom buttons */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E5E5E5]">
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            disabled={current === 0}
            className="flex-1 py-3 rounded-2xl border border-[#E5E5E5] text-[14px] font-bold text-[#1A1A1A] disabled:opacity-30"
          >
            이전
          </button>
          <button
            onClick={handleNext}
            disabled={isNextDisabled}
            className="flex-1 py-3 rounded-2xl bg-[#1A1A1A] text-white text-[14px] font-bold disabled:opacity-40"
          >
            {current + 1 === questions.length ? '검토하기' : '다음'}
          </button>
        </div>
      </div>
    </div>
  )
}
