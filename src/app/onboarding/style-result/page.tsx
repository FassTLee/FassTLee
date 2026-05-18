'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import Image from 'next/image'

const STYLE_TYPE_KEY = 'kinepia_learning_type'
const STYLE_KEY      = 'kinepia_learning_style'

type LearningType = 'conceptualizer' | 'memorizer' | 'planner' | 'intensive'

const RESULTS: Record<LearningType, {
  title: string
  badge: string
  icon: string
  desc: string
  tips: { icon: string; text: string }[]
  color: string
}> = {
  conceptualizer: {
    title: '이해형',
    badge: '원리 탐구 학습자',
    icon:  '/assets/icons/user/user-learning-conceptual.svg',
    desc:  '원리와 개념 중심으로 학습해요. 상세한 설명으로 깊이 있는 이해를 추구합니다.',
    tips: [
      { icon: '📖', text: '레슨에서 상세 설명 전체 제공' },
      { icon: '🔍', text: '원리·이유 중심 해설' },
      { icon: '🔗', text: '개념 간 연결고리 학습' },
    ],
    color: '#639922',
  },
  memorizer: {
    title: '암기형',
    badge: '핵심 반복 학습자',
    icon:  '/assets/icons/user/user-learning-memory.svg',
    desc:  '핵심 키워드 중심으로 학습해요. 짧고 반복적인 노출로 효율적인 암기를 완성합니다.',
    tips: [
      { icon: '✨', text: '레슨에서 핵심 키워드 강조 표시' },
      { icon: '⚡', text: '빠른 반복 테스트로 기억 강화' },
      { icon: '🃏', text: '플래시카드 방식 핵심 정리' },
    ],
    color: '#378ADD',
  },
  planner: {
    title: '계획형',
    badge: '체계적 전략 학습자',
    icon:  '/assets/icons/user/user-learning-planner.svg',
    desc:  '계획을 세워 체계적으로 학습해요. 목표와 일정을 관리하며 꾸준히 나아갑니다.',
    tips: [
      { icon: '📅', text: '주간 학습 스케줄 자동 설정' },
      { icon: '✅', text: '진도 체크리스트로 성취감 확인' },
      { icon: '📊', text: '목표 달성률 리포트 제공' },
    ],
    color: '#9B59B6',
  },
  intensive: {
    title: '강제형',
    badge: '집중 몰입 학습자',
    icon:  '/assets/icons/user/user-learning-intensive.svg',
    desc:  '집중해서 몰아서 공부해요. 압박감과 데드라인을 활용해 최대 집중력을 끌어냅니다.',
    tips: [
      { icon: '🔥', text: '짧고 강한 집중 세션 제공' },
      { icon: '⏱', text: '타이머 기반 스프린트 학습' },
      { icon: '🎯', text: '기출 문제 빠른 풀이 위주' },
    ],
    color: '#E24B4A',
  },
}

export default function StyleResultPage() {
  const { status } = useSession()
  const router = useRouter()
  const [type, setType]       = useState<LearningType | null>(null)
  const [nextPath, setNextPath] = useState<string | null>(null) // null = 로딩 중

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    // 신규 4-type 키 우선, 없으면 기존 2-type 키로 fallback
    const saved = (localStorage.getItem(STYLE_TYPE_KEY) ??
                   localStorage.getItem(STYLE_KEY)) as LearningType | null

    if (!saved || !RESULTS[saved]) {
      router.replace('/onboarding/style-test')
      return
    }
    setType(saved)

    // cert_type이 이미 있으면 자격증 선택 건너뛰고 대시보드로
    // localStorage에 cert가 있어도 이미 선택한 것으로 간주
    const localCert = localStorage.getItem('kinepia_selected_cert')
    if (localCert) {
      setNextPath('/trainer/dashboard')
      return
    }
    fetch('/api/v1/profile-me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setNextPath(d.certType ? '/trainer/dashboard' : '/select-cert'))
      .catch(() => setNextPath('/select-cert'))
  }, [status, router])

  if (!type) {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const r = RESULTS[type]

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* 아이콘 + 유형 */}
          <div className="text-center mb-8">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: `${r.color}15` }}
            >
              <Image
                src={r.icon}
                alt={r.title}
                width={64}
                height={64}
              />
            </div>
            <div
              className="inline-block text-[10px] font-bold px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${r.color}20`, color: r.color }}
            >
              {r.badge}
            </div>
            <h1 className="text-[26px] font-black text-[#1A1A1A] mb-2">
              당신은 <span style={{ color: r.color }}>{r.title}</span>입니다!
            </h1>
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
            onClick={() => nextPath && router.replace(nextPath)}
            disabled={!nextPath}
            className="w-full flex items-center justify-center gap-2 py-4 bg-[#E24B4A] disabled:opacity-50 text-white rounded-2xl text-[16px] font-bold"
          >
            {nextPath === '/trainer/dashboard' ? '학습 시작하기' : '자격증 선택하기'}
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
