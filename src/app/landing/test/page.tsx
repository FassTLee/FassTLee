'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { LANDING_QUESTIONS, evaluateTest, type TestResult } from '@/lib/landingTest'
import { ImagePlaceholder } from '@/components/common'

// ================================================================
// 랜딩 테스트 플로우: intro → quiz → save-result → /landing/report
// ================================================================

type Step = 'intro' | 'quiz' | 'save-result'

const PROGRESS_LABELS = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5']

function getOrCreateGuestId(): string {
  const key = 'kinepia_guest_id'
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

async function saveGuestTestResult(guestId: string, result: TestResult) {
  try {
    await fetch('/api/v1/guest-test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guest_id: guestId,
        score: result.score,
        total_questions: result.totalQuestions,
        correct_answers: result.score,
        level_result: String(result.percentage),
        answers_json: result.answers,
      }),
    })
  } catch {
    // Supabase 미설정 시 무시
  }
}

export default function LandingTestPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('intro')
  const [currentQ, setCurrentQ] = useState(0)
  const [answers, setAnswers] = useState<(number | null)[]>(Array(5).fill(null))
  const [showExplanation, setShowExplanation] = useState(false)
  const [quizResult, setQuizResult] = useState<TestResult | null>(null)

  const q = LANDING_QUESTIONS[currentQ]
  const selectedAnswer = answers[currentQ]
  const totalQ = LANDING_QUESTIONS.length

  const handleAnswer = (idx: number) => {
    if (showExplanation) return
    const newAnswers = [...answers]
    newAnswers[currentQ] = idx
    setAnswers(newAnswers)
    setShowExplanation(true)
  }

  const handleNext = () => {
    setShowExplanation(false)
    if (currentQ < totalQ - 1) {
      setCurrentQ(currentQ + 1)
    } else {
      // 퀴즈 완료 → 결과 계산 → save-result 단계로
      const result = evaluateTest(answers)
      sessionStorage.setItem('testResult', JSON.stringify(result))

      // 게스트 ID 생성 & 비동기 저장 (fire-and-forget)
      const guestId = getOrCreateGuestId()
      saveGuestTestResult(guestId, result)

      setQuizResult(result)
      setStep('save-result')
    }
  }

  const handleLoginSave = (provider: 'google' | 'kakao') => {
    // sessionStorage 결과는 OAuth 리다이렉트 후에도 같은 탭에서 유지됨
    signIn(provider, { callbackUrl: '/landing/report' })
  }

  const handleGuestView = () => {
    router.push('/landing/report')
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
              <h1 className="text-[22px] font-black text-[#1A1A1A] mb-2">해부학 수준 테스트</h1>
              <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
                5문제로 나의 해부학 수준을 확인하고<br />
                맞춤 학습 경로를 추천받으세요
              </p>
            </div>

            <div className="space-y-2.5 mb-6">
              {[
                { icon: '📝', text: '총 5문제 (이미지 선택 3 + 객관식 2)' },
                { icon: '⏱', text: '약 3~5분 소요' },
                { icon: '🎯', text: '취약 파트 분석 + 학습 경로 추천' },
                { icon: '💾', text: '테스트 후 로그인으로 결과 저장 가능' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-[#F5F5F3] rounded-xl px-3 py-2.5">
                  <span className="text-[16px]">{item.icon}</span>
                  <span className="text-[13px] text-[#1A1A1A]">{item.text}</span>
                </div>
              ))}
            </div>

            {/* 로그인 없이 바로 시작 */}
            <button
              onClick={() => setStep('quiz')}
              className="w-full py-4 bg-[#E24B4A] text-white rounded-2xl text-[16px] font-bold"
            >
              테스트 시작하기
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── SAVE-RESULT ─────────────────────────────────────────────────
  if (step === 'save-result' && quizResult) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl p-6 border border-[#E5E5E5] shadow-sm">
            {/* 헤더 */}
            <div className="text-center mb-5">
              <div className="text-[40px] mb-2">🎉</div>
              <h2 className="text-[20px] font-black text-[#1A1A1A] mb-1">테스트 완료!</h2>
              <p className="text-[14px] text-[#6B6B6B]">결과를 저장하시겠어요?</p>
            </div>

            {/* 점수 미리보기 */}
            <div className="bg-[#F5F5F3] rounded-2xl p-4 mb-5 text-center">
              <div className="text-[40px] font-black text-[#1A1A1A]">
                {quizResult.score}
                <span className="text-[22px] font-bold text-[#ADADAD]"> / {quizResult.totalQuestions}</span>
              </div>
              <div className="text-[13px] text-[#6B6B6B] mt-1">{quizResult.percentage}% 정답률</div>
            </div>

            {/* Option A — 로그인 저장 */}
            <div className="space-y-2.5">
              <button
                onClick={() => handleLoginSave('google')}
                className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-semibold text-[#1A1A1A] hover:bg-[#F5F5F3] transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                구글로 저장하기
              </button>

              <button
                onClick={() => handleLoginSave('kakao')}
                className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[14px] font-semibold text-[#000000] hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#FEE500' }}
              >
                <span className="text-[16px] font-black leading-none">K</span>
                카카오로 저장하기
              </button>

              <p className="text-[11px] text-[#6B6B6B] text-center leading-relaxed">
                로그인하면 결과가 내 계정에 저장되고<br />학습 이력을 계속 이어갈 수 있어요
              </p>
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-[#E5E5E5]" />
              <span className="text-[11px] text-[#ADADAD]">또는</span>
              <div className="flex-1 h-px bg-[#E5E5E5]" />
            </div>

            {/* Option B — 비회원 결과 보기 */}
            <button
              onClick={handleGuestView}
              className="w-full py-3.5 border border-dashed border-[#CCCCCC] rounded-2xl text-[14px] font-medium text-[#6B6B6B] hover:bg-[#F5F5F3] transition-colors"
            >
              로그인 없이 결과 보기
            </button>
            <p className="text-[10px] text-[#ADADAD] text-center mt-2">
              이번 결과만 확인하고 싶다면
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─── QUIZ ────────────────────────────────────────────────────────
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
            <div className="text-[14px] font-semibold text-[#1A1A1A]">
              {currentQ + 1} / {totalQ}
            </div>
            <div className="w-8 h-8" />
          </div>
          {/* Progress bar */}
          <div className="flex gap-1.5">
            {PROGRESS_LABELS.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor:
                    i < currentQ ? '#639922'
                    : i === currentQ ? '#E24B4A'
                    : '#E5E5E5',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="max-w-sm mx-auto px-4 py-6 space-y-4">
        {/* Type badge */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
            q.type === 'A'
              ? 'bg-[#378ADD]/15 text-[#378ADD]'
              : 'bg-[#639922]/15 text-[#639922]'
          }`}>
            {q.type === 'A' ? '🖼 이미지 선택형' : '📝 객관식'}
          </span>
        </div>

        {/* Question text */}
        <h2 className="text-[17px] font-bold text-[#1A1A1A] leading-relaxed">{q.question}</h2>

        {/* Image (Type A) */}
        {q.type === 'A' && (
          <div className="user-select-none">
            <ImagePlaceholder
              width={500}
              height={350}
              label={`해부학 이미지 — ${q.imageUrl?.split('/').pop()?.replace('.svg', '') ?? ''}`}
              className="rounded-2xl"
            />
          </div>
        )}

        {/* Options */}
        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            const isSelected = selectedAnswer === i
            const isCorrect = i === q.correctIndex
            let style = 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
            if (showExplanation) {
              if (isCorrect) style = 'bg-[#639922]/10 border-[#639922] text-[#1A1A1A]'
              else if (isSelected && !isCorrect) style = 'bg-[#E24B4A]/10 border-[#E24B4A] text-[#E24B4A]'
              else style = 'bg-white border-[#E5E5E5] text-[#ADADAD] opacity-60'
            } else if (isSelected) {
              style = 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
            }

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={showExplanation}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 text-left transition-all text-[14px] font-medium ${style}`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  showExplanation && isCorrect ? 'border-[#639922] bg-[#639922]'
                  : showExplanation && isSelected && !isCorrect ? 'border-[#E24B4A]'
                  : isSelected ? 'border-white bg-white'
                  : 'border-[#CCCCCC]'
                }`}>
                  {showExplanation && isCorrect
                    ? <CheckCircle2 size={14} className="text-white" />
                    : isSelected && !showExplanation
                    ? <div className="w-2.5 h-2.5 rounded-full bg-[#1A1A1A]" />
                    : <Circle size={14} className="opacity-0" />
                  }
                </div>
                <span>{String.fromCharCode(65 + i)}. {opt}</span>
              </button>
            )
          })}
        </div>

        {/* Explanation */}
        {showExplanation && (
          <div className={`rounded-xl p-4 border ${
            selectedAnswer === q.correctIndex
              ? 'bg-[#639922]/10 border-[#639922]/30'
              : 'bg-[#E24B4A]/5 border-[#E24B4A]/20'
          }`}>
            <div className={`text-[13px] font-bold mb-1 ${
              selectedAnswer === q.correctIndex ? 'text-[#639922]' : 'text-[#E24B4A]'
            }`}>
              {selectedAnswer === q.correctIndex ? '✅ 정답!' : '❌ 오답'}
            </div>
            <p className="text-[12px] text-[#1A1A1A] leading-relaxed">{q.explanation}</p>
          </div>
        )}

        {/* Next button */}
        {showExplanation && (
          <button
            onClick={handleNext}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
          >
            {currentQ < totalQ - 1
              ? <><span>다음 문제</span><ChevronRight size={16} /></>
              : <><span>결과 저장 선택</span><ChevronRight size={16} /></>
            }
          </button>
        )}
      </div>
    </div>
  )
}
