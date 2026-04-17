'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Check } from 'lucide-react'

// ================================================================
// 온보딩 서베이 — 로그인 직후 최초 1회만 표시
// localStorage 'kinepia_onboarding_done' 로 완료 여부 관리
// ================================================================

const ONBOARDING_KEY = 'kinepia_onboarding_done'
const DESTINATION = '/trainer/education'

type Step = 0 | 1 | 2 | 3   // 0=loading, 1~3=질문

interface Answers {
  gender: string
  ageGroup: string
  occupation: string
  occupationCustom: string
}

const GENDER_OPTIONS = ['남성', '여성', '기타']
const AGE_OPTIONS = ['20대', '30대', '40대', '50대 이상']
const OCCUPATION_OPTIONS = [
  '필라테스 강사',
  '퍼스널 트레이너',
  '학생 (자격증 준비)',
  '기타',
]

export default function OnboardingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [answers, setAnswers] = useState<Answers>({
    gender: '',
    ageGroup: '',
    occupation: '',
    occupationCustom: '',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (status === 'loading') return

    // 비로그인 → 랜딩으로
    if (status === 'unauthenticated') {
      router.replace('/landing')
      return
    }

    // 이미 온보딩 완료 → 대시보드로
    if (typeof window !== 'undefined' && localStorage.getItem(ONBOARDING_KEY)) {
      router.replace(DESTINATION)
      return
    }

    setStep(1)
  }, [status, router])

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await fetch('/api/v1/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gender: answers.gender,
          age_group: answers.ageGroup,
          occupation: answers.occupation === '기타' ? answers.occupationCustom : answers.occupation,
        }),
      })
    } catch {
      // Supabase 미설정 시 무시 — localStorage는 항상 저장
    }
    localStorage.setItem(ONBOARDING_KEY, '1')
    router.replace(DESTINATION)
  }

  // ─── Loading ─────────────────────────────────────────────────
  if (step === 0) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const totalSteps = 3
  const progress = (step / totalSteps) * 100

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-[#E5E5E5]">
        <div
          className="h-full bg-[#E24B4A] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-[13px] text-[#ADADAD] mb-2">{step} / {totalSteps}</div>
            <h1 className="text-[22px] font-black text-[#1A1A1A]">
              {session?.user?.name ? `${session.user.name}님,` : ''}
            </h1>
            <p className="text-[16px] font-bold text-[#1A1A1A] mt-1">
              {step === 1 && '성별을 알려주세요'}
              {step === 2 && '연령대를 알려주세요'}
              {step === 3 && '직업을 알려주세요'}
            </p>
            <p className="text-[12px] text-[#6B6B6B] mt-2">
              맞춤형 학습 경로 추천에 활용됩니다
            </p>
          </div>

          {/* ─── Q1: 성별 ─── */}
          {step === 1 && (
            <div className="space-y-3">
              {GENDER_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswers((a) => ({ ...a, gender: opt }))}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-[15px] font-semibold transition-all ${
                    answers.gender === opt
                      ? 'border-[#E24B4A] bg-[#E24B4A]/5 text-[#E24B4A]'
                      : 'border-[#E5E5E5] bg-white text-[#1A1A1A]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    answers.gender === opt ? 'border-[#E24B4A] bg-[#E24B4A]' : 'border-[#CCCCCC]'
                  }`}>
                    {answers.gender === opt && <Check size={11} className="text-white" />}
                  </div>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* ─── Q2: 연령대 ─── */}
          {step === 2 && (
            <div className="space-y-3">
              {AGE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswers((a) => ({ ...a, ageGroup: opt }))}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-[15px] font-semibold transition-all ${
                    answers.ageGroup === opt
                      ? 'border-[#E24B4A] bg-[#E24B4A]/5 text-[#E24B4A]'
                      : 'border-[#E5E5E5] bg-white text-[#1A1A1A]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    answers.ageGroup === opt ? 'border-[#E24B4A] bg-[#E24B4A]' : 'border-[#CCCCCC]'
                  }`}>
                    {answers.ageGroup === opt && <Check size={11} className="text-white" />}
                  </div>
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* ─── Q3: 직업 ─── */}
          {step === 3 && (
            <div className="space-y-3">
              {OCCUPATION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setAnswers((a) => ({ ...a, occupation: opt }))}
                  className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-[15px] font-semibold transition-all ${
                    answers.occupation === opt
                      ? 'border-[#E24B4A] bg-[#E24B4A]/5 text-[#E24B4A]'
                      : 'border-[#E5E5E5] bg-white text-[#1A1A1A]'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                    answers.occupation === opt ? 'border-[#E24B4A] bg-[#E24B4A]' : 'border-[#CCCCCC]'
                  }`}>
                    {answers.occupation === opt && <Check size={11} className="text-white" />}
                  </div>
                  {opt}
                </button>
              ))}
              {answers.occupation === '기타' && (
                <input
                  type="text"
                  placeholder="직접 입력해주세요"
                  value={answers.occupationCustom}
                  onChange={(e) => setAnswers((a) => ({ ...a, occupationCustom: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-xl border-2 border-[#E24B4A] text-[14px] outline-none bg-white"
                  autoFocus
                />
              )}
            </div>
          )}

          {/* 다음 / 완료 버튼 */}
          <div className="mt-8 space-y-3">
            <button
              onClick={() => {
                if (step < 3) {
                  setStep((s) => (s + 1) as Step)
                } else {
                  handleSubmit()
                }
              }}
              disabled={
                submitting ||
                (step === 1 && !answers.gender) ||
                (step === 2 && !answers.ageGroup) ||
                (step === 3 && (!answers.occupation || (answers.occupation === '기타' && !answers.occupationCustom.trim())))
              }
              className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] disabled:opacity-40 text-white rounded-2xl text-[16px] font-bold transition-all"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : step < 3 ? (
                <><span>다음</span><ChevronRight size={16} /></>
              ) : (
                <span>시작하기 🚀</span>
              )}
            </button>

            {/* 건너뛰기 */}
            <button
              onClick={() => {
                localStorage.setItem(ONBOARDING_KEY, '1')
                router.replace(DESTINATION)
              }}
              className="w-full py-3 text-[13px] text-[#ADADAD]"
            >
              건너뛰기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
