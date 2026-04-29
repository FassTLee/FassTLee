'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, Lock } from 'lucide-react'

const CERT_KEY = 'kinepia_selected_cert'

interface SubCert {
  id: string | null
  icon: string
  name: string
  active: boolean
}

const SPORTS_SUB: SubCert[] = [
  { id: 'sports-instructor-2', icon: '🥈', name: '2급 생활스포츠지도사', active: true },
  { id: null, icon: '🥇', name: '1급 생활스포츠지도사',    active: false },
  { id: null, icon: '🥈', name: '2급 전문스포츠지도사',    active: false },
  { id: null, icon: '🥇', name: '1급 전문스포츠지도사',    active: false },
  { id: null, icon: '👶', name: '유소년스포츠지도사',       active: false },
  { id: null, icon: '👴', name: '노인스포츠지도사',         active: false },
  { id: null, icon: '🥈', name: '2급 장애인스포츠지도사',  active: false },
  { id: null, icon: '🥇', name: '1급 장애인스포츠지도사',  active: false },
]

export default function SelectCertPage() {
  const { status } = useSession()
  const router = useRouter()
  const [sportsOpen, setSportsOpen] = useState(false)
  const [tooltip, setTooltip] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }
  }, [status, router])

  const handleSelect = (certId: string) => {
    localStorage.setItem(CERT_KEY, certId)
    router.push('/select-subject')
  }

  const showTooltip = (name: string) => {
    setTooltip(name)
    setTimeout(() => setTooltip(null), 1800)
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
        <button onClick={() => router.push('/')} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 홈
        </button>
        <p className="text-[10px] font-bold text-[#E24B4A] tracking-widest uppercase mb-1">Kinepia</p>
        <h1 className="text-[22px] font-black text-[#1A1A1A]">자격증 선택</h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1">준비 중인 자격증을 선택하세요</p>
      </div>

      {/* 툴팁 */}
      {tooltip && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1A] text-white text-[12px] font-semibold px-4 py-2 rounded-full shadow-lg">
          준비 중입니다 🚧
        </div>
      )}

      <div className="p-4 space-y-3">

        {/* ── 건강운동관리사 ── */}
        <button
          onClick={() => handleSelect('health-exercise-manager')}
          className="w-full bg-white rounded-2xl border-2 border-[#E5E5E5] p-5 text-left flex items-center gap-4 active:bg-[#F5F5F3] transition-all"
        >
          <div className="text-[36px] flex-shrink-0">🏥</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[16px] font-black text-[#1A1A1A]">건강운동관리사</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E24B4A]/10 text-[#E24B4A]">Beta</span>
            </div>
            <p className="text-[12px] text-[#6B6B6B]">운동생리학·해부학·운동처방론 등</p>
          </div>
          <ChevronRight size={18} className="text-[#ADADAD] flex-shrink-0" />
        </button>

        {/* ── 스포츠지도사 (아코디언) ── */}
        <div className="bg-white rounded-2xl border-2 border-[#E5E5E5] overflow-hidden">
          <button
            onClick={() => setSportsOpen((v) => !v)}
            className="w-full p-5 text-left flex items-center gap-4 active:bg-[#F5F5F3] transition-all"
          >
            <div className="text-[36px] flex-shrink-0">🏅</div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[16px] font-black text-[#1A1A1A]">스포츠지도사</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E24B4A]/10 text-[#E24B4A]">Beta</span>
              </div>
              <p className="text-[12px] text-[#6B6B6B]">생활·전문·장애인·유소년·노인</p>
            </div>
            <ChevronDown
              size={18}
              className={`text-[#ADADAD] flex-shrink-0 transition-transform duration-200 ${sportsOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {/* 아코디언 내용 */}
          {sportsOpen && (
            <div className="border-t border-[#F0F0EE]">
              {SPORTS_SUB.map((sub, idx) => (
                <button
                  key={sub.name}
                  onClick={() => {
                    if (sub.active && sub.id) handleSelect(sub.id)
                    else showTooltip(sub.name)
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${
                    idx < SPORTS_SUB.length - 1 ? 'border-b border-[#F5F5F3]' : ''
                  } ${sub.active ? 'active:bg-[#F5F5F3]' : 'cursor-not-allowed opacity-40'}`}
                >
                  <span className="text-[20px] flex-shrink-0">{sub.icon}</span>
                  <span className={`flex-1 text-[14px] font-semibold ${sub.active ? 'text-[#1A1A1A]' : 'text-[#6B6B6B]'}`}>
                    {sub.name}
                  </span>
                  {sub.active
                    ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E24B4A]/10 text-[#E24B4A]">Beta</span>
                    : <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5E5E5] text-[#ADADAD]">준비중</span>
                  }
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── 비활성화 카드 ── */}
        <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider px-1 pt-1">준비 중</p>

        {[
          { icon: '🦴', name: 'Basic 해부학',  desc: '근골격계 기초 — 뼈·근육·관절' },
          { icon: '💪', name: '기능 해부학',   desc: '기시·정지·작용 마스터 코스' },
        ].map((item) => (
          <button
            key={item.name}
            onClick={() => showTooltip(item.name)}
            className="w-full bg-[#F5F5F3] rounded-2xl border-2 border-[#E5E5E5] p-5 text-left flex items-center gap-4 opacity-40 cursor-not-allowed"
          >
            <div className="text-[36px] flex-shrink-0">{item.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[16px] font-black text-[#1A1A1A]">{item.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5E5E5] text-[#ADADAD]">Coming Soon</span>
              </div>
              <p className="text-[12px] text-[#6B6B6B]">{item.desc}</p>
            </div>
            <Lock size={15} className="text-[#ADADAD] flex-shrink-0" />
          </button>
        ))}

      </div>
    </div>
  )
}
