'use client'

import { useEffect, useState, useCallback, Suspense } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { ChevronLeft, X, CheckCircle2, XCircle, RotateCcw, BookOpen } from 'lucide-react'

// ── 상수 ──────────────────────────────────────────────
const _MAIN_Q = 3   // 메인 모의고사 문제 수 (API 서버에서 3문제 고정)

// ── 타입 ──────────────────────────────────────────────
interface OralQuestion {
  id: string
  question: string
  explanation: string | null
  /** 실제 표시되는 보기 순서 (리뷰 시 셔플됨) */
  options: string[]
  /** options[i] 의 원본 인덱스 → submit 시 사용 */
  originalIndices: number[]
}

interface QResult {
  question:      OralQuestion
  selectedIndex: number    // 원본 인덱스
  correct:       boolean
  answerIndex:   number    // 원본 정답 인덱스
  explanation:   string | null
}

// ── 보기 라벨 정리 (①② 제거) ──────────────────────────
function cleanOpt(opt: string): string {
  return opt.replace(/^\s*[①②③④⑤\d]+[.)、]?\s*/, '').trim()
}

// ── 배열 셔플 (원본 인덱스 트래킹 포함) ──────────────────
function shuffleWithIndices<T>(arr: T[]): { items: T[]; indices: number[] } {
  const indices = arr.map((_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return { items: indices.map((i) => arr[i]), indices }
}

// ── 진행 도트 ──────────────────────────────────────────
function ProgressDots({ total, current, phase }: {
  total: number; current: number; phase: 'draw' | 'answer'
}) {
  return (
    <div className="flex items-center justify-center gap-2 my-5">
      {Array.from({ length: total }, (_, i) => {
        const done    = i < current
        const active  = i === current && phase === 'answer'
        const pending = i > current || (i === current && phase === 'draw')
        return (
          <div
            key={i}
            className={`transition-all duration-300 rounded-full ${
              done   ? 'w-3 h-3 bg-[#00A651]' :
              active ? 'w-3 h-3 bg-[#00A651]/50 ring-2 ring-[#00A651]' :
              pending ? 'w-2.5 h-2.5 bg-[#E5E5E5]' : ''
            }`}
          />
        )
      })}
    </div>
  )
}

// ══════════════════════════════════════════════════════
function OralExamContent() {
  const { status } = useSession()
  const router       = useRouter()
  const params       = useParams()
  const searchParams = useSearchParams()
  const courseId     = params.courseId as string
  const isPreview    = searchParams.get('preview') === 'true'

  // ── 데이터 로드 ────────────────────────────────────
  const [questions,  setQuestions]  = useState<OralQuestion[]>([])
  const [loading,    setLoading]    = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [nextExamDate, setNextExamDate] = useState<string | null>(null)

  // ── oral 자기평가 state ──────────────────────────
  const [userAnswers,     setUserAnswers]     = useState<Record<string, string>>({})
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set())

  // ── 메인 세션 상태 ─────────────────────────────────
  const [phase,       setPhase]       = useState<'draw' | 'answer' | 'result'>('draw')
  const [qIdx,        setQIdx]        = useState(0)
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null)
  const [submitting,  _setSubmitting]  = useState(false)
  const [results,     setResults]     = useState<QResult[]>([])

  // ── 리뷰 세션 상태 ─────────────────────────────────
  const [reviewMode,     setReviewMode]     = useState(false)
  const [reviewQs,       setReviewQs]       = useState<OralQuestion[]>([])
  const [reviewPhase,    setReviewPhase]    = useState<'draw' | 'answer' | 'result'>('draw')
  const [reviewQIdx,     setReviewQIdx]     = useState(0)
  const [reviewSelected, setReviewSelected] = useState<number | null>(null)
  const [reviewResults,  setReviewResults]  = useState<QResult[]>([])

  // ── 팝업 ──────────────────────────────────────────
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  // ── Auth guard (preview 시 skip) ────────────────
  useEffect(() => {
    if (!isPreview && status === 'unauthenticated') router.replace('/landing')
  }, [status, router, isPreview])

  // ── 문제 fetch ────────────────────────────────────
  useEffect(() => {
    if (!isPreview && status !== 'authenticated') return
    if (isPreview && status === 'loading') return
    const url = `/api/v1/oral-exam/draw?courseId=${courseId}${isPreview ? '&count=2' : ''}`
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (!d.questions?.length) { setFetchError(true); setLoading(false); return }
        setQuestions(
          d.questions.map((q: { id: string; question: string; options: string[]; explanation?: string }) => ({
            ...q,
            explanation: q.explanation ?? null,
            originalIndices: q.options.map((_, i) => i),
          })),
        )
        setLoading(false)
      })
      .catch(() => { setFetchError(true); setLoading(false) })
  }, [status, courseId, isPreview])

  // ── 다음 모의고사 일정 fetch (없으면 무시) ───────────
  useEffect(() => {
    supabaseFetchSchedule().then(setNextExamDate).catch(() => {})
  }, [])

  async function supabaseFetchSchedule(): Promise<string | null> {
    try {
      const res  = await fetch('/api/v1/oral-exam/schedule')
      const data = await res.json()
      return data.nextDate ?? null
    } catch { return null }
  }

  // ── 현재 활성 세션 값 ──────────────────────────────
  const activePhase    = reviewMode ? reviewPhase    : phase
  const activeQIdx     = reviewMode ? reviewQIdx     : qIdx
  const activeQs       = reviewMode ? reviewQs       : questions
  const activeSelected = reviewMode ? reviewSelected : selectedOpt
  const activeResults  = reviewMode ? reviewResults  : results
  const setActiveSelected = useCallback(
    (v: number | null) => reviewMode ? setReviewSelected(v) : setSelectedOpt(v),
    [reviewMode],
  )

  const currentQ = activeQs[activeQIdx]
  const totalQ   = activeQs.length

  // ── 제출 (자기평가 기반) ──────────────────────────
  const handleSubmit = () => {
    if (activeSelected === null || !currentQ || submitting) return

    const correct = activeSelected === 0   // 알았다=true, 오답노트=false

    const result: QResult = {
      question:      currentQ,
      selectedIndex: activeSelected,
      correct,
      answerIndex:   0,
      explanation:   currentQ.explanation,
    }

    if (reviewMode) {
      const next = [...reviewResults, result]
      setReviewResults(next)
      setReviewSelected(null)
      if (reviewQIdx >= totalQ - 1) setReviewPhase('result')
      else { setReviewQIdx((i) => i + 1); setReviewPhase('draw') }
    } else {
      const next = [...results, result]
      setResults(next)
      setSelectedOpt(null)
      if (qIdx >= totalQ - 1) setPhase('result')
      else { setQIdx((i) => i + 1); setPhase('draw') }
    }
  }

  // ── 오답 복습 시작 ────────────────────────────────
  const startReview = () => {
    const wrongResults = results.filter((r) => !r.correct)
    if (!wrongResults.length) return

    // 각 오답 문제의 보기 셔플
    const rqs = wrongResults
      .sort(() => Math.random() - 0.5)
      .map((r) => {
        const { items, indices } = shuffleWithIndices(r.question.options)
        return {
          id:              r.question.id,
          question:        r.question.question,
          explanation:     r.question.explanation,
          options:         items,
          // 셔플된 위치 i → r.question.originalIndices[indices[i]] → 원본 인덱스
          originalIndices: indices.map((i) => r.question.originalIndices[i]),
        }
      })

    setReviewQs(rqs)
    setReviewPhase('draw')
    setReviewQIdx(0)
    setReviewSelected(null)
    setReviewResults([])
    setReviewMode(true)
  }

  // ── 취소 / 나가기 ──────────────────────────────────
  const handleCancel = () => {
    if (activePhase === 'answer') { setShowExitConfirm(true); return }
    router.push('/trainer/dashboard?tab=classroom')
  }

  const optionLabel = ['A', 'B', 'C', 'D', 'E']

  // ════════════════════════════════════════════════
  // ── 로딩 ────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (fetchError) return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center px-6 text-center">
      <div className="text-[48px] mb-4">😢</div>
      <p className="text-[16px] font-bold text-[#1A1A1A] mb-2">문제를 불러올 수 없어요</p>
      <p className="text-[13px] text-[#6B6B6B] mb-8">강의에 등록된 문제가 없거나 연결에 실패했어요.</p>
      <button
        onClick={() => router.back()}
        className="px-6 py-3 bg-[#1A1A1A] text-white rounded-2xl text-[14px] font-bold"
      >
        돌아가기
      </button>
    </div>
  )

  // ════════════════════════════════════════════════
  // ── 결과 화면 ────────────────────────────────────
  if (activePhase === 'result') {
    const correct    = activeResults.filter((r) => r.correct).length
    const wrongCount = activeResults.length - correct
    const isReview   = reviewMode

    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
        {/* 헤더 */}
        <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4 flex items-center gap-3">
          <button
            onClick={() => router.push(courseId ? `/chapters/${courseId}` : '/trainer/dashboard')}
            className="w-8 h-8 flex items-center justify-center"
          >
            <X size={20} className="text-[#6B6B6B]" />
          </button>
          <h1 className="text-[17px] font-black text-[#1A1A1A]">
            {isReview ? '오답 복습 결과' : '구술 모의고사 결과'}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-32">
          {/* 점수 카드 */}
          <div className="bg-white rounded-3xl p-6 mt-5 text-center shadow-sm">
            <div className="text-[56px] mb-2">{correct === activeResults.length ? '🏆' : correct === 0 ? '😢' : '💪'}</div>
            <div className="text-[42px] font-black text-[#1A1A1A] leading-none">
              {correct}<span className="text-[22px] text-[#ADADAD] font-medium">/{activeResults.length}</span>
            </div>
            <p className="text-[14px] text-[#6B6B6B] mt-2">
              {correct === activeResults.length
                ? '완벽해요! 모두 정답이에요 🎉'
                : `${wrongCount}개 오답이 있어요. 복습해봐요!`}
            </p>
          </div>

          {/* 문제별 결과 */}
          <div className="mt-5 space-y-4">
            {activeResults.map((r, i) => {
              // 표시용 정답 인덱스 (options 배열에서 answerIndex 위치 찾기)
              const displayAnswerIdx = r.question.originalIndices.indexOf(r.answerIndex)
              const displaySelectedIdx = r.question.originalIndices.indexOf(r.selectedIndex)
              return (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm">
                  <div className="flex items-start gap-2 mb-3">
                    {r.correct
                      ? <CheckCircle2 size={18} className="text-[#00A651] flex-shrink-0 mt-0.5" />
                      : <XCircle     size={18} className="text-[#E24B4A] flex-shrink-0 mt-0.5" />
                    }
                    <p className="text-[13px] font-semibold text-[#1A1A1A] leading-snug">{r.question.question}</p>
                  </div>

                  {/* 보기 목록 */}
                  <div className="space-y-1.5 mb-3">
                    {r.question.options.map((opt, oi) => {
                      const isAnswer   = oi === displayAnswerIdx
                      const isSelected = oi === displaySelectedIdx
                      return (
                        <div
                          key={oi}
                          className={`flex items-start gap-2 px-3 py-2 rounded-xl text-[12px] ${
                            isAnswer
                              ? 'bg-[#00A65110] border border-[#00A65130] text-[#00A651] font-semibold'
                              : isSelected && !r.correct
                                ? 'bg-[#E24B4A10] border border-[#E24B4A30] text-[#E24B4A] line-through'
                                : 'bg-[#F5F5F3] text-[#6B6B6B]'
                          }`}
                        >
                          <span className="font-bold flex-shrink-0">{optionLabel[oi]}.</span>
                          <span>{cleanOpt(opt)}</span>
                          {isAnswer   && <span className="ml-auto text-[11px]">✅ 정답</span>}
                          {isSelected && !r.correct && <span className="ml-auto text-[11px]">❌ 내 답</span>}
                        </div>
                      )
                    })}
                  </div>

                  {/* 해설 */}
                  {r.explanation && (
                    <div className="bg-[#F5F5F3] rounded-xl px-3 py-2.5">
                      <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                        <span className="font-bold text-[#1A1A1A]">해설 </span>{r.explanation}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 다음 모의고사 일정 (메인 결과만) */}
          {!isReview && nextExamDate && (
            <div className="mt-4 bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-[#00A651]/10 flex items-center justify-center text-[16px]">📅</div>
              <div>
                <p className="text-[11px] text-[#ADADAD]">다음 모의고사 일정</p>
                <p className="text-[14px] font-bold text-[#1A1A1A]">{nextExamDate}</p>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] px-5 pb-8 pt-4 flex gap-3">
          <button
            onClick={() => isPreview ? router.back() : router.push(courseId ? `/chapters/${courseId}` : '/trainer/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-bold text-[#6B6B6B]"
          >
            <BookOpen size={16} /> {isPreview ? '닫기' : '강의실'}
          </button>
          {!isReview && (
            <button
              onClick={startReview}
              disabled={results.filter((r) => !r.correct).length === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl text-[14px] font-bold transition-all ${
                results.filter((r) => !r.correct).length > 0
                  ? 'bg-[#E24B4A] text-white'
                  : 'bg-[#E5E5E5] text-[#ADADAD] cursor-not-allowed'
              }`}
            >
              <RotateCcw size={16} /> 오답 복습
            </button>
          )}
          {isReview && (
            <button
              onClick={() => {
                setReviewMode(false)
                setPhase('draw')
                setQIdx(0)
                setSelectedOpt(null)
                setResults([])
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#00A651] text-white rounded-2xl text-[14px] font-bold"
            >
              처음부터 다시
            </button>
          )}
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════
  // ── 문제 뽑기 / 답변 화면 ───────────────────────
  const isNextDisabled =
    activeSelected === null || !revealedAnswers.has(currentQ?.id ?? '')

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* preview 배너 */}
      {isPreview && (
        <div className="bg-[#1A1A1A] text-white text-[11px] text-center py-[7px] flex items-center justify-center gap-2">
          <span className="w-[5px] h-[5px] rounded-full bg-[#00A651] inline-block flex-shrink-0" />
          체험 모드 · 2문제 미리보기 · 기록 저장 안 됨
        </div>
      )}

      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={handleCancel} className="w-8 h-8 flex items-center justify-center">
              <ChevronLeft size={20} className="text-[#6B6B6B]" />
            </button>
            <h1 className="text-[16px] font-black text-[#1A1A1A]">
              {reviewMode ? '오답 복습' : '구술 모의고사'}
            </h1>
          </div>
          <button onClick={handleCancel} className="w-8 h-8 flex items-center justify-center">
            <X size={18} className="text-[#ADADAD]" />
          </button>
        </div>

        {/* 진행 도트 */}
        <ProgressDots total={totalQ} current={activeQIdx} phase={activePhase} />
        <p className="text-center text-[12px] text-[#ADADAD] -mt-2">
          {activeQIdx + 1} / {totalQ} 문제
        </p>
      </div>

      {/* 본문 */}
      <div className="flex-1 flex flex-col p-5">

        {/* ── DRAW 단계 ── */}
        {activePhase === 'draw' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {/* 빈 슬롯 카드 */}
            <div className="w-full max-w-sm bg-white rounded-3xl border-2 border-dashed border-[#E5E5E5] h-44 flex flex-col items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-[#F5F5F3] flex items-center justify-center mx-auto mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ADADAD" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p className="text-[12px] text-[#ADADAD]">문제가 여기에 표시돼요</p>
              <p className="text-[10px] text-[#ADADAD] opacity-60 mt-1">버튼을 눌러 문제를 뽑아보세요</p>
            </div>

            <button
              onClick={() => (reviewMode ? setReviewPhase('answer') : setPhase('answer'))}
              className="w-full max-w-sm py-4 bg-[#1A1A1A] text-white rounded-2xl text-[16px] font-black flex items-center justify-center gap-2"
            >
              🎲 문제 {activeQIdx + 1} 뽑기
            </button>

            <p className="text-[12px] text-[#ADADAD] text-center">
              버튼을 눌러 문제를 뽑아주세요
            </p>
          </div>
        )}

        {/* ── ANSWER 단계 ── */}
        {activePhase === 'answer' && currentQ && (
          <div className="flex-1 flex flex-col gap-4">
            {/* 문제 카드 */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-[11px] font-black text-white flex-shrink-0">
                  {activeQIdx + 1}
                </div>
                <span className="text-[11px] text-[#ADADAD] font-medium">구술 문제</span>
              </div>
              <p className="text-[15px] font-bold text-[#1A1A1A] leading-snug">
                {currentQ.question}
              </p>
            </div>

            {/* ① 답변 입력 단계 */}
            {!revealedAnswers.has(currentQ.id) && (
              <>
                <textarea
                  value={userAnswers[currentQ.id] ?? ''}
                  onChange={(e) => setUserAnswers((prev) => ({ ...prev, [currentQ.id]: e.target.value }))}
                  placeholder="답변을 입력하세요..."
                  rows={4}
                  className="w-full border border-[#E5E5E5] rounded-2xl px-4 py-3 text-[13px] outline-none resize-none"
                />
                <button
                  disabled={!userAnswers[currentQ.id]?.trim()}
                  onClick={() => setRevealedAnswers((prev) => { const s = new Set(prev); s.add(currentQ.id); return s })}
                  className="w-full py-3 rounded-2xl bg-[#1A1A1A] text-white text-[14px] font-bold disabled:opacity-40"
                >
                  모범답안 확인
                </button>
              </>
            )}

            {/* ② 모범답안 확인 후 */}
            {revealedAnswers.has(currentQ.id) && (
              <>
                <div className="bg-[#F5F5F3] rounded-2xl px-4 py-3 mb-2">
                  <p className="text-[10px] text-[#ADADAD] mb-1">내 답변</p>
                  <p className="text-[13px] text-[#1A1A1A]">{userAnswers[currentQ.id]}</p>
                </div>
                <div className="bg-[#f0fbf4] border border-[#C0DD97] rounded-2xl px-4 py-3 mb-3">
                  <p className="text-[10px] text-[#00A651] mb-1">모범답안</p>
                  <p className="text-[13px] text-[#1A1A1A]">{currentQ.explanation ?? '(모범답안 없음)'}</p>
                </div>
                <div className="flex items-start gap-2 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl px-4 py-3 mb-3">
                  <span className="text-[14px] flex-shrink-0">💡</span>
                  <p className="text-[11px] text-[#92400E] leading-relaxed">
                    현재 베타 서비스로 주관식 자동 채점은 준비 중입니다.<br />
                    모범답안과 비교 후 양심껏 채점해 주세요 😊
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveSelected(0)}
                    className={`flex-1 py-3 rounded-2xl text-[13px] font-bold border ${
                      activeSelected === 0
                        ? 'bg-[#00A651] text-white border-[#00A651]'
                        : 'border-[#E5E5E5] text-[#1A1A1A]'
                    }`}
                  >
                    알았다 ✓
                  </button>
                  <button
                    onClick={() => setActiveSelected(1)}
                    className={`flex-1 py-3 rounded-2xl text-[13px] font-bold border ${
                      activeSelected === 1
                        ? 'bg-[#FF3B30] text-white border-[#FF3B30]'
                        : 'border-[#E5E5E5] text-[#1A1A1A]'
                    }`}
                  >
                    오답노트 저장
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 하단 버튼 */}
      {activePhase === 'answer' && (
        <div className="flex-shrink-0 p-5 bg-white border-t border-[#E5E5E5]">
          <button
            onClick={handleSubmit}
            disabled={isNextDisabled || submitting}
            className={`w-full py-4 rounded-2xl text-[16px] font-black transition-all flex items-center justify-center gap-2 ${
              !isNextDisabled && !submitting
                ? 'bg-[#00A651] text-white'
                : 'bg-[#E5E5E5] text-[#ADADAD] cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              '제출 →'
            )}
          </button>
        </div>
      )}

      {/* ══════════ 종료 확인 팝업 ══════════ */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-6">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <div className="text-center mb-5">
              <div className="text-[36px] mb-2">⚠️</div>
              <h3 className="text-[16px] font-black text-[#1A1A1A] mb-1.5">모의고사를 종료할까요?</h3>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                진행 중인 답변은 저장되지 않습니다.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 border border-[#E5E5E5] rounded-xl text-[13px] font-medium text-[#6B6B6B]"
              >
                계속하기
              </button>
              <button
                onClick={() => router.push(courseId ? `/chapters/${courseId}` : '/trainer/dashboard')}
                className="flex-1 py-3 bg-[#E24B4A] rounded-xl text-[13px] font-bold text-white"
              >
                종료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OralExamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <OralExamContent />
    </Suspense>
  )
}
