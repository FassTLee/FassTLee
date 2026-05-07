'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ChevronLeft } from 'lucide-react'
import { LANDING_QUESTIONS, type TestResult, type TestQuestion } from '@/lib/landingTest'
import { supabase } from '@/lib/supabase'

type Step = 'intro' | 'quiz' | 'login'

const TOTAL_Q = 10

// ── helpers ─────────────────────────────────────────────────────

function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('kinepia_guest_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('kinepia_guest_id', id) }
  return id
}

async function fetchDBQuestions(): Promise<TestQuestion[] | null> {
  try {
    const { data, error } = await supabase
      .from('chapter_questions')
      .select('id, question, options, answer_index, explanation')
      .limit(80)
    if (error || !data || data.length < TOTAL_Q) return null
    return [...data]
      .sort(() => Math.random() - 0.5)
      .slice(0, TOTAL_Q)
      .map((q) => ({
        id: q.id,
        type: 'B' as const,
        question: q.question ?? '',
        options: Array.isArray(q.options) ? q.options : [],
        correctIndex: q.answer_index ?? 0,
        explanation: q.explanation ?? '',
      }))
  } catch {
    return null
  }
}

// ── inner component (uses useSearchParams) ──────────────────────

function LandingTestContent() {
  const router     = useRouter()
  const _refId     = useSearchParams().get('ref')

  const [step, setStep]           = useState<Step>('intro')
  const [currentQ, setCurrentQ]   = useState(0)
  const [answers, setAnswers]     = useState<(number | null)[]>(Array(TOTAL_Q).fill(null))
  const [activeQs, setActiveQs]   = useState<TestQuestion[]>(
    [...LANDING_QUESTIONS, ...LANDING_QUESTIONS].slice(0, TOTAL_Q) // fallback: 5개 반복
  )
  const [questionsReady, setQuestionsReady] = useState(false)

  useEffect(() => {
    getOrCreateGuestId()
    fetchDBQuestions().then((qs) => {
      if (qs && qs.length === TOTAL_Q) setActiveQs(qs)
      setQuestionsReady(true)
    })
  }, [])

  const q              = activeQs[currentQ]
  const selectedAnswer = answers[currentQ]
  const totalQ         = activeQs.length

  const handleAnswer = (idx: number) => {
    if (answers[currentQ] !== null) return
    const newAnswers = [...answers]
    newAnswers[currentQ] = idx
    setAnswers(newAnswers)

    setTimeout(() => {
      if (currentQ < totalQ - 1) {
        setCurrentQ(currentQ + 1)
      } else {
        // 마지막 문제 → 결과 계산 후 sessionStorage 저장
        let score = 0
        const weakAreas: string[] = []
        activeQs.forEach((aq, i) => {
          if (newAnswers[i] === aq.correctIndex) { score++ }
          else if (aq.weakArea) { weakAreas.push(aq.weakArea) }
        })
        const result: TestResult = {
          score,
          totalQuestions: totalQ,
          answers: newAnswers.map((a) => a ?? -1),
          weakAreas,
          percentage: Math.round((score / totalQ) * 100),
        }
        sessionStorage.setItem('landingTestResult', JSON.stringify(result))

        // guest 저장 (fire-and-forget)
        const gid = getOrCreateGuestId()
        fetch('/api/v1/guest-test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guest_id: gid,
            score: result.score,
            total_questions: result.totalQuestions,
            correct_answers: result.score,
            level_result: String(result.percentage),
            answers_json: result.answers,
          }),
        }).catch(() => {})

        setStep('login')
      }
    }, 350)
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
              className="w-full py-4 bg-[#E24B4A] text-white rounded-2xl text-[16px] font-bold disabled:opacity-50"
            >
              {questionsReady ? '테스트 시작하기' : '문제 불러오는 중...'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── LOGIN (테스트 완료 후) ──────────────────────────────────────
  if (step === 'login') {
    const stored = typeof window !== 'undefined'
      ? JSON.parse(sessionStorage.getItem('landingTestResult') ?? 'null') as TestResult | null
      : null
    const pct = stored?.percentage ?? 0
    const score = stored?.score ?? 0

    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-sm">
            {/* 테스트 결과 미리보기 */}
            <div className="text-center mb-6">
              <div className="text-[44px] mb-2">
                {pct >= 80 ? '🏆' : pct >= 60 ? '💪' : '📖'}
              </div>
              <h2 className="text-[20px] font-black text-[#1A1A1A] mb-1">테스트 완료!</h2>
              <div className="bg-[#F5F5F3] rounded-2xl py-4 px-6 mt-3 mb-2">
                <span className="text-[40px] font-black text-[#1A1A1A]">{score}</span>
                <span className="text-[22px] font-bold text-[#ADADAD]"> / {TOTAL_Q}</span>
                <p className="text-[13px] text-[#6B6B6B] mt-1">{pct}% 정답률</p>
              </div>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed mt-3">
                로그인하면 <span className="font-bold text-[#E24B4A]">학습 유형 검사</span>와 함께<br />
                상세 리포트 및 대시보드를 이용할 수 있어요
              </p>
            </div>

            {/* 로그인 버튼 */}
            <div className="space-y-2.5">
              <button
                onClick={() => signIn('google', { callbackUrl: '/landing/survey' })}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-semibold text-[#1A1A1A]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                구글로 계속하기
              </button>

              <button
                onClick={() => signIn('kakao', { callbackUrl: '/landing/survey' })}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[14px] font-semibold text-[#000000]"
                style={{ backgroundColor: '#FEE500' }}
              >
                <span className="text-[16px] font-black leading-none">K</span>
                카카오로 계속하기
              </button>
            </div>

            <p className="text-[11px] text-[#ADADAD] text-center mt-4 leading-relaxed">
              로그인하면 결과가 저장되고 무료로 학습을 시작할 수 있어요
            </p>
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
              className="h-full bg-[#E24B4A] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        <h2 className="text-[17px] font-bold text-[#1A1A1A] leading-relaxed">{q.question}</h2>

        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isSelected = selectedAnswer === i
            const isAnswered = selectedAnswer !== null
            const style = isSelected
              ? 'bg-[#E24B4A]/10 border-[#E24B4A] text-[#1A1A1A]'
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
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LandingTestContent />
    </Suspense>
  )
}
