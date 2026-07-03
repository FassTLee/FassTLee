'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { LANDING_QUESTIONS, type TestResult } from '@/lib/landingTest'

type Step = 'intro' | 'quiz' | 'loading' | 'major'

const TOTAL_Q = 10

// 퀴즈 진행 중에는 정답(correctIndex)/해설을 클라이언트가 알 필요가 없고
// 알아서도 안 됨 — 채점은 서버(landing-test-grade)에서만 수행
interface QuizQuestion {
  id: string
  question: string
  imageUrl?: string
  options: string[]
}

// ── helpers ─────────────────────────────────────────────────────

function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('kinepia_guest_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('kinepia_guest_id', id) }
  return id
}

function toQuizQuestion(q: { id: string; question: string; imageUrl?: string; options: string[] }): QuizQuestion {
  return { id: q.id, question: q.question, imageUrl: q.imageUrl, options: q.options }
}

// chapter-test(P0-3)와 동일한 패턴: 서버 API에서 문제만 받아오고
// answer_index/explanation은 클라이언트로 전송하지 않음
async function fetchQuizQuestions(): Promise<QuizQuestion[] | null> {
  try {
    const res = await fetch('/api/v1/landing-test-questions')
    if (!res.ok) return null
    const { questions } = await res.json()
    if (!Array.isArray(questions) || questions.length < TOTAL_Q) return null
    return questions
  } catch {
    return null
  }
}

// ── inner component (uses useSearchParams) ──────────────────────

function LandingTestContent() {
  const router  = useRouter()
  const _refId  = useSearchParams().get('ref')

  const [step, setStep]               = useState<Step>('intro')
  const [currentQ, setCurrentQ]       = useState(0)
  const [answers, setAnswers]         = useState<(number | null)[]>(Array(TOTAL_Q).fill(null))
  const [activeQs, setActiveQs]       = useState<QuizQuestion[]>(
    [...LANDING_QUESTIONS, ...LANDING_QUESTIONS].slice(0, TOTAL_Q).map(toQuizQuestion)
  )
  const [questionsReady, setQuestionsReady]   = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [selectedMajor, setSelectedMajor]     = useState<boolean | null>(null)
  const [showMajorAlert, setShowMajorAlert]   = useState(false)
  const [gradingFailed, setGradingFailed]     = useState(false)

  useEffect(() => {
    getOrCreateGuestId()
    fetchQuizQuestions().then((qs) => {
      if (qs && qs.length === TOTAL_Q) setActiveQs(qs)
      setQuestionsReady(true)
    })
  }, [])

  // 로딩 바 애니메이션 (3초)
  useEffect(() => {
    if (step !== 'loading') return
    setLoadingProgress(0)
    const start    = Date.now()
    const duration = 3000
    const timer    = setInterval(() => {
      const elapsed  = Date.now() - start
      const progress = Math.min(Math.round((elapsed / duration) * 100), 100)
      setLoadingProgress(progress)
      if (progress >= 100) {
        clearInterval(timer)
        setStep('major')
      }
    }, 30)
    return () => clearInterval(timer)
  }, [step])

  const q              = activeQs[currentQ]
  const selectedAnswer = answers[currentQ]
  const totalQ         = activeQs.length

  // 마지막 문제 응답 후 서버에 채점 요청 (정답은 서버만 알고 있음, test-complete와 동일 패턴)
  const submitForGrading = async (finalAnswers: (number | null)[]) => {
    setGradingFailed(false)
    const answerRecords = activeQs.map((aq, i) => ({ id: aq.id, selected: finalAnswers[i] }))
    try {
      const res = await fetch('/api/v1/landing-test-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerRecords }),
      })
      if (!res.ok) throw new Error('grade request failed')
      const graded = await res.json()

      const result: TestResult = {
        score:          graded.score,
        totalQuestions: graded.totalQuestions,
        answers:        finalAnswers.map((a) => a ?? -1),
        weakAreas:      graded.weakAreas ?? [],
        percentage:     graded.percentage,
      }
      localStorage.setItem('landingTestResult', JSON.stringify(result))
      localStorage.setItem('landingTestQuestions', JSON.stringify(graded.scoredRecords))
      sessionStorage.setItem('landingTestResult', JSON.stringify(result))

      // guest 저장 (fire-and-forget)
      const gid = getOrCreateGuestId()
      fetch('/api/v1/guest-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_id:        gid,
          score:           result.score,
          total_questions: result.totalQuestions,
          correct_answers: result.score,
          level_result:    String(result.percentage),
          answers_json:    result.answers,
        }),
      }).catch(() => {})

      setStep('loading')
    } catch {
      // 채점 서버 요청 실패 — 재시도 안내 배너 표시
      setGradingFailed(true)
    }
  }

  const handleAnswer = (idx: number) => {
    if (answers[currentQ] !== null) return
    const newAnswers = [...answers]
    newAnswers[currentQ] = idx
    setAnswers(newAnswers)

    setTimeout(() => {
      if (currentQ < totalQ - 1) {
        setCurrentQ(currentQ + 1)
      } else {
        submitForGrading(newAnswers)
      }
    }, 350)
  }

  const handleMajorConfirm = () => {
    if (selectedMajor === null) {
      setShowMajorAlert(true)
      return
    }
    localStorage.setItem('kinepia_is_major', String(selectedMajor))
    const gid = getOrCreateGuestId()
    fetch('/api/v1/guest-major', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_id: gid, is_major: selectedMajor }),
    }).catch(() => {})
    router.push('/landing/report')
  }

  // ─── LOADING ────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
        <div className="w-full max-w-sm text-center">
          <div className="text-[56px] mb-6">🧠</div>
          <h2 className="text-[22px] font-black text-[#1A1A1A] mb-2">결과를 분석 중입니다</h2>
          <p className="text-[13px] text-[#6B6B6B] mb-8">나의 취약 파트를 찾고 있어요...</p>
          <div className="w-full h-2.5 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00A651] rounded-full transition-all duration-75"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <p className="text-[12px] text-[#ADADAD] mt-3">{loadingProgress}%</p>
        </div>
      </div>
    )
  }

  // ─── MAJOR ──────────────────────────────────────────────────────
  if (step === 'major') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-sm">
            <div className="text-center mb-6">
              <div className="text-[40px] mb-3">🎓</div>
              <p className="text-[11px] font-bold text-[#00A651] uppercase tracking-widest mb-1">
                잠깐, 하나만 여쭤볼게요!
              </p>
              <h2 className="text-[20px] font-black text-[#1A1A1A]">전공자이신가요?</h2>
              <p className="text-[13px] text-[#6B6B6B] mt-2">더 정확한 맞춤 분석을 위해 필요해요</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => setSelectedMajor(true)}
                className={`flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border-2 transition-all ${
                  selectedMajor === true
                    ? 'border-[#00A651] bg-[#00A651]/10'
                    : 'border-[#E5E5E5] bg-[#F9F9F9]'
                }`}
              >
                <span className="text-[32px]">🎓</span>
                <span className="text-[14px] font-bold text-[#1A1A1A]">전공자</span>
                <span className="text-[11px] text-[#6B6B6B] text-center">체육·운동 관련학과</span>
              </button>
              <button
                onClick={() => setSelectedMajor(false)}
                className={`flex flex-col items-center gap-2 py-5 px-3 rounded-2xl border-2 transition-all ${
                  selectedMajor === false
                    ? 'border-[#00A651] bg-[#00A651]/10'
                    : 'border-[#E5E5E5] bg-[#F9F9F9]'
                }`}
              >
                <span className="text-[32px]">💼</span>
                <span className="text-[14px] font-bold text-[#1A1A1A]">비전공자</span>
                <span className="text-[11px] text-[#6B6B6B] text-center">타 전공 / 독학</span>
              </button>
            </div>

            <button
              onClick={handleMajorConfirm}
              className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
            >
              결과 확인하기
            </button>
          </div>
        </div>

        {/* 전공/비전공 미선택 경고 팝업 */}
        {showMajorAlert && (
          <div className="fixed inset-0 z-50 flex items-end justify-center pb-6 bg-black/40 px-6">
            <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl">
              <div className="text-center mb-5">
                <div className="text-[32px] mb-3">🎯</div>
                <h3 className="text-[17px] font-black text-[#1A1A1A] mb-2">
                  전공/비전공 선택이 필요해요!
                </h3>
                <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                  더 정확한 맞춤 분석을 위해<br />필요합니다
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => setShowMajorAlert(false)}
                  className="w-full py-3.5 bg-[#00A651] text-white rounded-2xl text-[14px] font-bold"
                >
                  선택하기
                </button>
                <button
                  onClick={() => { setShowMajorAlert(false); router.push('/landing/report') }}
                  className="w-full py-3.5 text-[#6B6B6B] text-[14px] font-medium"
                >
                  그냥 결과 보기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── INTRO ──────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <button
            onClick={() => router.push('/landing')}
            className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-6"
          >
            <ChevronLeft size={16} /> 랜딩으로
          </button>

          <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-sm">
            <div className="text-center mb-6">
              <div className="text-[40px] mb-3">🧠</div>
              <h1 className="text-[22px] font-black text-[#1A1A1A] mb-2">무료 실력 테스트</h1>
              <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
                10문제로 나의 현재 수준을 확인하고<br />
                맞춤 학습 경로를 추천받으세요
              </p>
            </div>

            <div className="space-y-2.5 mb-6">
              {[
                { icon: '📝', text: `총 ${TOTAL_Q}문제 · 약 5~7분 소요` },
                { icon: '🎯', text: '취약 파트 분석 제공' },
                { icon: '🧬', text: '학습 유형 검사 (로그인 후)' },
                { icon: '🚀', text: '맞춤 대시보드 바로 시작' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#F5F5F3] rounded-xl px-3 py-2.5">
                  <span className="text-[16px]">{item.icon}</span>
                  <span className="text-[13px] text-[#1A1A1A]">{item.text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => questionsReady && setStep('quiz')}
              disabled={!questionsReady}
              className="w-full py-4 bg-[#00A651] text-white rounded-2xl text-[16px] font-bold disabled:opacity-50"
            >
              {questionsReady ? '테스트 시작하기' : '문제 불러오는 중...'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── QUIZ ────────────────────────────────────────────────────────
  const progress = ((currentQ + 1) / totalQ) * 100

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] px-4 py-4 sticky top-0 z-10">
        <div className="max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => currentQ > 0 ? setCurrentQ(currentQ - 1) : setStep('intro')}
              className="w-8 h-8 flex items-center justify-center"
            >
              <ChevronLeft size={20} className="text-[#6B6B6B]" />
            </button>
            <span className="text-[14px] font-semibold text-[#1A1A1A]">
              {currentQ + 1} / {totalQ}
            </span>
            <div className="w-8" />
          </div>
          <div className="w-full h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#00A651] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* 채점 실패 재시도 배너 */}
      {gradingFailed && (
        <div className="max-w-sm mx-auto px-4 pt-4">
          <div className="flex items-center justify-between gap-3 bg-[#FFF0F0] border border-[#E24B4A]/30 rounded-xl px-4 py-3">
            <p className="text-[12px] text-[#E24B4A] font-medium">채점 중 오류가 발생했어요. 다시 시도해주세요.</p>
            <button
              onClick={() => submitForGrading(answers)}
              className="flex-shrink-0 text-[12px] font-bold text-white bg-[#E24B4A] rounded-lg px-3 py-1.5"
            >
              재시도
            </button>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        <h2 className="text-[17px] font-bold text-[#1A1A1A] leading-relaxed">{q.question}</h2>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isSelected = selectedAnswer === i
            const isAnswered = selectedAnswer !== null
            const style = isSelected
              ? 'bg-[#00A651]/10 border-[#00A651] text-[#1A1A1A]'
              : isAnswered
              ? 'bg-white border-[#E5E5E5] text-[#ADADAD] opacity-50'
              : 'bg-white border-[#E5E5E5] text-[#1A1A1A]'

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={isAnswered}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all text-[14px] font-medium ${style}`}
              >
                <span className="flex-1">{opt}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── export (Suspense wrapper) ─────────────────────────────────────

export default function LandingTestPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LandingTestContent />
    </Suspense>
  )
}
