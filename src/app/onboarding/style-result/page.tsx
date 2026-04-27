'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const STYLE_KEY = 'kinepia_learning_style'

const RESULTS = {
  memorizer: {
    emoji: '🧠',
    title: '당신은 암기형입니다!',
    desc: '핵심 키워드 중심으로 학습합니다. 짧고 반복적인 노출로 효율적 암기!',
    tips: [
      { icon: '✨', text: '레슨에서 핵심 키워드 강조 표시' },
      { icon: '⚡', text: '빠른 반복 테스트로 기억 강화' },
      { icon: '🃏', text: '플래시카드 방식 핵심 정리' },
    ],
    color: '#378ADD',
  },
  conceptualizer: {
    emoji: '💡',
    title: '당신은 이해형입니다!',
    desc: '원리와 개념 중심으로 학습합니다. 상세한 설명으로 깊이 있는 이해!',
    tips: [
      { icon: '📖', text: '레슨에서 상세 설명 전체 제공' },
      { icon: '🔍', text: '원리·이유 중심 해설' },
      { icon: '🔗', text: '개념 간 연결고리 학습' },
    ],
    color: '#639922',
  },
}

export default function StyleResultPage() {
  const { status } = useSession()
  const router = useRouter()
  const [style, setStyle] = useState<'memorizer' | 'conceptualizer' | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.replace('/landing')
      return
    }
    const saved = localStorage.getItem(STYLE_KEY) as 'memorizer' | 'conceptualizer' | null
    if (!saved) {
      router.replace('/onboarding/style-test')
      return
    }
    setStyle(saved)
  }, [status, router])

  if (!style) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const r = RESULTS[style]

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* 결과 카드 */}
          <div className="text-center mb-8">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center text-[40px] mx-auto mb-5"
              style={{ backgroundColor: `${r.color}15` }}
            >
              {r.emoji}
            </div>
            <h1 className="text-[24px] font-black text-[#1A1A1A] mb-3">{r.title}</h1>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">{r.desc}</p>
          </div>

          {/* 학습 방법 */}
          <div
            className="rounded-2xl p-5 mb-8"
            style={{ backgroundColor: `${r.color}10`, border: `1.5px solid ${r.color}30` }}
          >
            <p className="text-[11px] font-bold tracking-widest mb-3" style={{ color: r.color }}>
              나에게 맞는 학습 방법
            </p>
            <div className="space-y-3">
              {r.tips.map((tip, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[18px]">{tip.icon}</span>
                  <span className="text-[13px] font-medium text-[#1A1A1A]">{tip.text}</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => router.replace('/select-subject')}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] text-white rounded-2xl text-[16px] font-bold"
          >
            학습 시작하기 <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
