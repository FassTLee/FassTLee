'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { LearningTypeIcon } from '@/components/common/LearningTypeIcon'
import { LEARNING_TYPES, getLearningTypeMeta, type LearningType } from '@/lib/learning-types'

const STYLE_TYPE_KEY = 'kinepia_learning_type'

export default function StyleResultPage() {
  const { status } = useSession()
  const router = useRouter()
  const [type, setType]       = useState<LearningType | null>(null)
  const [nextPath, setNextPath] = useState<string | null>(null) // null = 로딩 중

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    const saved = localStorage.getItem(STYLE_TYPE_KEY)
    const savedMeta = getLearningTypeMeta(saved)

    if (!savedMeta) {
      router.replace('/onboarding/style-test')
      return
    }
    setType(savedMeta.key)

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

  const r = LEARNING_TYPES[type]

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
              <LearningTypeIcon type={r.key} size={64} />
            </div>
            <div
              className="inline-block text-[10px] font-bold px-3 py-1 rounded-full mb-3"
              style={{ backgroundColor: `${r.color}20`, color: r.color }}
            >
              {r.badge}
            </div>
            <h1 className="text-[26px] font-black text-[#1A1A1A] mb-2">
              당신은 <span style={{ color: r.color }}>{r.label}</span>입니다!
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
