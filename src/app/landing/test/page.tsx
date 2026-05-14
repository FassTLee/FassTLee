'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { LANDING_QUESTIONS, type TestResult, type TestQuestion } from '@/lib/landingTest'
import { supabase } from '@/lib/supabase'

type Step = 'intro' | 'quiz'

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
        // localStorage에 저장 (OAuth 리다이렉트 후에도 유지)
        localStorage.setItem('landingTestResult', JSON.stringify(result))
        localStorage.setItem('landingTestQuestions', JSON.stringify(activeQs))
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

        router.push('/landing/report')
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
