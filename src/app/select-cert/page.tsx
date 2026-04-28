'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Lock } from 'lucide-react'

const CERT_KEY = 'kinepia_selected_cert'

const CERTS = [
  {
    id: null,
    icon: '🦴',
    name: 'Basic 해부학',
    desc: '근골격계 기초 — 뼈·근육·관절',
    badge: 'Coming Soon',
    active: false,
  },
  {
    id: null,
    icon: '💪',
    name: '기능 해부학',
    desc: '기시·정지·작용 마스터 코스',
    badge: 'Coming Soon',
    active: false,
  },
  {
    id: 'sports-instructor',
    icon: '⚽',
    name: '생활스포츠지도사',
    desc: '스포츠사회학·윤리·교육학 등',
    badge: 'Beta',
    active: true,
  },
  {
    id: 'health-exercise-manager',
    icon: '🏥',
    name: '건강운동관리사',
    desc: '운동생리학·해부학·운동처방론 등',
    badge: 'Beta',
    active: true,
  },
]

export default function SelectCertPage() {
  const { status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
  }, [status, router])

  const handleSelect = (certId: string) => {
    localStorage.setItem(CERT_KEY, certId)
    router.push('/select-subject')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E24B4A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-5">
        <p className="text-[10px] font-bold text-[#E24B4A] tracking-widest uppercase mb-1">Kinepia</p>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">자격증 선택</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">준비 중인 자격증을 선택하세요</p>
      </div>

      <div className="p-4 space-y-3">
        {CERTS.map((cert) => (
          <button
            key={cert.name}
            onClick={() => cert.active && cert.id && handleSelect(cert.id)}
            disabled={!cert.active}
            className={`w-full rounded-2xl border-2 p-5 text-left transition-all ${
              cert.active
                ? 'bg-white border-[#E5E5E5] active:bg-[#F5F5F3]'
                : 'bg-[#F5F5F3] border-[#E5E5E5] opacity-50 cursor-not-allowed'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-[32px]">{cert.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-black text-[#1A1A1A]">{cert.name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        cert.active
                          ? 'bg-[#E24B4A]/10 text-[#E24B4A]'
                          : 'bg-[#E5E5E5] text-[#ADADAD]'
                      }`}
                    >
                      {cert.badge}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#6B6B6B] mt-0.5">{cert.desc}</p>
                </div>
              </div>
              {cert.active
                ? <ChevronRight size={18} className="text-[#ADADAD] flex-shrink-0 mt-1" />
                : <Lock size={15} className="text-[#ADADAD] flex-shrink-0 mt-1" />
              }
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
