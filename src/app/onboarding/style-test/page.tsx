'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const STYLE_KEY = 'kinepia_learning_style'

const QUESTIONS = [
  {
    q: '새로운 개념을 배울 때 나는?',
    a: '핵심 단어만 외운다',
    b: '원리를 이해하려 한다',
  },
  {
    q: '시험 공부 방식은?',
    a: '반복해서 여러 번 읽는다',
    b: '한 번 읽어도 이해하면 충분',
  },
  {
    q: '모르는 내용이 나오면?',
    a: '일단 외우고 나중에 이해',
    b: '이해될 때까지 파고든다',
  },
  {
    q: '공부 집중 시간은?',
    a: '짧게 자주',
    b: '길게 한번에',
  },
  {
    q: '오답이 나왔을 때?',
    a: '정답을 반복해서 외운다',
    b: '왜 틀렸는지 분석한다',
  },
  {
    q: '선호하는 학습 자료는?',
    a: '요약본 / 정리노트',
    b: '교재 / 상세 설명',
  },
]

export default function StyleTestPage() {
  const { status } = useSession()
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState<('A' | 'B')[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.replace('/landing')
      return
    }
    // 이미 테스트 완료 → 과목 선택으로
    const existing = localStorage.getItem(STYLE_KEY)
    if (existing) {
      router.replace('/select-subject')
    }
  }, [status, router])

  const handleAnswer = async (choice: 'A' | 'B') => {
    const next = [...answers, choice]
    if (next.length < QUESTIONS.length) {
      setAnswers(next)
      setCurrent(current + 1)
      return
    }
    // 마지막 답변 → 결과 계산
    setSaving(true)
    const aCount = next.filter((v) => v === 'A').length
    const result = aCount >= 4 ? 'memorizer' : 'conceptualizer'
    localStorage.setItem(STYLE_KEY, result)
    try {
      await fetch('/api/v1/learning-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_style: result }),
      })
    } catch {
      // 저장 실패해도 localStorage에 저장됨
    }
    router.replace('/onboarding/style-result')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const progress = ((current + 1) / QUESTIONS.length) * 100
  const q = QUESTIONS[current]

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* 프로그레스 바 */}
      <div className="h-1 bg-[#E5E5E5]">
        <div
          className="h-full bg-[#E24B4A] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <div className="text-[12px] text-[#ADADAD] mb-3">{current + 1} / {QUESTIONS.length}</div>
            <p className="text-[10px] font-semibold text-[#E24B4A] tracking-widest uppercase mb-2">학습 성향 테스트</p>
            <h2 className="text-[20px] font-black text-[#1A1A1A] leading-snug">{q.q}</h2>
          </div>

          <div className="space-y-3">
            {(['A', 'B'] as const).map((choice) => (
              <button
                key={choice}
                onClick={() => !saving && handleAnswer(choice)}
                disabled={saving}
                className="w-full flex items-center gap-4 px-5 py-5 rounded-2xl border-2 border-[#E5E5E5] bg-white text-left text-[15px] font-semibold text-[#1A1A1A] active:bg-[#E24B4A]/5 active:border-[#E24B4A] transition-all"
              >
                <span className="w-7 h-7 rounded-full bg-[#F5F5F3] flex items-center justify-center text-[12px] font-black text-[#6B6B6B] flex-shrink-0">
                  {choice}
                </span>
                {choice === 'A' ? q.a : q.b}
              </button>
            ))}
          </div>

          {saving && (
            <div className="mt-8 flex items-center justify-center gap-2 text-[13px] text-[#ADADAD]">
              <div className="w-4 h-4 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
              결과 분석 중...
            </div>
          )}

          <button
            onClick={() => router.replace('/select-subject')}
            className="mt-10 w-full py-3 text-[12px] text-[#ADADAD]"
          >
            건너뛰기 <ChevronRight size={12} className="inline" />
          </button>
        </div>
      </div>
    </div>
  )
}
