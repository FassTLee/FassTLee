'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ChevronRight } from 'lucide-react'

const STYLE_KEY = 'kinepia_learning_style'

type LearningStyle = 'memorizer' | 'conceptualizer'

const LEARNING_TYPES: {
  value: LearningStyle
  label: string
  sub: string
  icon: string
}[] = [
  {
    value: 'conceptualizer',
    label: '이해형',
    sub: '원리를 이해하며 깊게 공부해요',
    icon: '/assets/icons/user/user-learning-conceptual.svg',
  },
  {
    value: 'memorizer',
    label: '암기형',
    sub: '핵심을 반복 암기해서 공부해요',
    icon: '/assets/icons/user/user-learning-memory.svg',
  },
  {
    value: 'conceptualizer',
    label: '계획형',
    sub: '계획을 세워 체계적으로 공부해요',
    icon: '/assets/icons/user/user-learning-planner.svg',
  },
  {
    value: 'memorizer',
    label: '강제형',
    sub: '집중해서 몰아서 공부해요',
    icon: '/assets/icons/user/user-learning-intensive.svg',
  },
]

export default function StyleTestPage() {
  const { status } = useSession()
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') {
      router.replace('/landing')
      return
    }
    const existing = localStorage.getItem(STYLE_KEY)
    if (existing) {
      router.replace('/select-subject')
    }
  }, [status, router])

  const handleSelect = async (value: LearningStyle) => {
    if (saving) return
    setSaving(true)
    localStorage.setItem(STYLE_KEY, value)
    try {
      await fetch('/api/v1/learning-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learning_style: value }),
      })
    } catch { /* ignore */ }
    router.replace('/onboarding/style-result')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      {/* 헤더 */}
      <div className="px-6 pt-14 pb-6">
        <p className="text-[10px] font-semibold text-[#E24B4A] tracking-widest uppercase mb-2">
          학습 성향 선택
        </p>
        <h2 className="text-[22px] font-black text-[#1A1A1A] leading-snug">
          나의 학습 유형은?
        </h2>
        <p className="text-[13px] text-[#6B6B6B] mt-2">
          가장 잘 맞는 유형을 선택하세요
        </p>
      </div>

      {/* 유형 카드 2×2 그리드 */}
      <div className="flex-1 px-4 pb-8">
        <div className="grid grid-cols-2 gap-3">
          {LEARNING_TYPES.map((type) => (
            <button
              key={type.label}
              onClick={() => handleSelect(type.value)}
              disabled={saving}
              className="bg-white rounded-2xl border-2 border-[#E5E5E5] p-5 text-left active:bg-[#F5F5F3] active:border-[#E24B4A] transition-all disabled:opacity-50"
            >
              <Image
                src={type.icon}
                alt={type.label}
                width={56}
                height={56}
                className="mb-3"
              />
              <p className="text-[15px] font-black text-[#1A1A1A] mb-1">{type.label}</p>
              <p className="text-[11px] text-[#6B6B6B] leading-snug">{type.sub}</p>
            </button>
          ))}
        </div>

        {saving && (
          <div className="mt-6 flex items-center justify-center gap-2 text-[13px] text-[#ADADAD]">
            <div className="w-4 h-4 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
            저장 중...
          </div>
        )}

        <button
          onClick={() => router.replace('/select-subject')}
          className="mt-6 w-full py-3 text-[12px] text-[#ADADAD]"
        >
          건너뛰기 <ChevronRight size={12} className="inline" />
        </button>
      </div>
    </div>
  )
}
