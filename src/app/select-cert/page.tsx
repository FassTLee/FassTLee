'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const CERT_KEY = 'kinepia_selected_cert'

interface CertRow {
  slug: string
  name: string
  is_active: boolean
}

const CERT_META: Record<string, {
  icon: string
  desc: string
  certId: string   // select-subject CERT_CONFIG 키 → localStorage 저장값
  color: string    // 배지 강조색 (hex)
  badgeLabel?: string
}> = {
  health_exercise_manager: {
    icon: '🏥',
    desc: '운동생리학·해부학·운동처방론 등',
    certId: 'health-exercise-manager',
    color: '#00A651',
    badgeLabel: 'Beta',
  },
  sport_instructor_lv2: {
    icon: '🏅',
    desc: '생활·전문·장애인·유소년·노인',
    certId: 'sports-instructor-2',
    color: '#2563EB',
  },
}

export default function SelectCertPage() {
  const { status } = useSession()
  const router = useRouter()
  const [tooltip, setTooltip] = useState<string | null>(null)
  const [certs, setCerts] = useState<CertRow[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    if (isSupabaseConfigured) {
      supabase
        .from('certifications')
        .select('slug, name, is_active')
        .then(({ data }) => { if (data) setCerts(data as CertRow[]) })
    }
  }, [status, router])

  const handleSelect = (slug: string) => {
    const certId = CERT_META[slug]?.certId ?? slug
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
        <div className="w-8 h-8 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F5F5F3]">
      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-5">
        <button onClick={() => router.push('/trainer/dashboard')} className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3">
          <ChevronLeft size={16} /> 대시보드
        </button>
        <p className="text-[10px] font-bold text-[#00A651] tracking-widest uppercase mb-1">Kinepia</p>
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

        {/* ── DB 기반 자격증 카드 ── */}
        {certs.map((cert) => {
          const meta = CERT_META[cert.slug]
          const icon = meta?.icon ?? '📋'
          const desc = meta?.desc ?? ''
          const color = meta?.color ?? '#6B6B6B'

          if (cert.is_active) {
            return (
              <button
                key={cert.slug}
                onClick={() => handleSelect(cert.slug)}
                className="w-full bg-white rounded-2xl border-2 border-[#E5E5E5] p-5 text-left flex items-center gap-4 active:bg-[#F5F5F3] transition-all"
              >
                <div className="text-[36px] flex-shrink-0">{icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[16px] font-black text-[#1A1A1A]">{cert.name}</span>
                    {meta?.badgeLabel && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${color}1A`, color }}
                      >
                        {meta.badgeLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] text-[#6B6B6B]">{desc}</p>
                </div>
                <ChevronRight size={18} className="text-[#ADADAD] flex-shrink-0" />
              </button>
            )
          }

          return (
            <button
              key={cert.slug}
              onClick={() => showTooltip(cert.name)}
              className="w-full bg-[#F5F5F3] rounded-2xl border-2 border-[#E5E5E5] p-5 text-left flex items-center gap-4 opacity-40 cursor-not-allowed"
            >
              <div className="text-[36px] flex-shrink-0">{icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[16px] font-black text-[#1A1A1A]">{cert.name}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5E5E5] text-[#ADADAD]">Coming Soon</span>
                </div>
                <p className="text-[12px] text-[#6B6B6B]">{desc}</p>
              </div>
              <Lock size={15} className="text-[#ADADAD] flex-shrink-0" />
            </button>
          )
        })}

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
