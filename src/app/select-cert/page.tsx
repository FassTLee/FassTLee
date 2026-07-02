'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown, Lock } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { track } from '@vercel/analytics'

const CERT_KEY = 'kinepia_selected_cert'

interface CertRow {
  id: string
  slug: string
  name: string
  is_active: boolean
}

const HIDDEN_CERT_IDS = [
  '40ac89d8-a6b7-4d53-8cbe-34ac40af6307', // 운동건강관리사 (화이트라벨 준비 중)
]

const CERT_META: Record<string, {
  icon: string
  desc: string
  certId: string   // select-subject CERT_CONFIG 키 → localStorage 저장값
  color: string    // 배지 강조색 (hex)
  badgeLabel?: string
}> = {
  exercise_prescriptionist: {
    icon: '🏥',
    desc: '운동생리학·해부학·운동처방론 등',
    certId: 'exercise-prescriptionist',
    color: '#00A651',
  },
  sport_instructor_lv2: {
    icon: '🏅',
    desc: '생활·전문·장애인·유소년·노인',
    certId: 'sports-instructor-2',
    color: '#2563EB',
  },
  health_exercise_manager: {
    icon: '💊',
    desc: '운동건강 통합 관리 과정',
    certId: 'exercise-prescriptionist',
    color: '#7C3AED',
  },
  'iipa-pilates-lv1': {
    icon: '🧘',
    desc: '필라테스 해부학 기초',
    certId: 'iipa-pilates-lv1',
    color: '#00A651',
  },
  'iipa-pilates-lv2': {
    icon: '🧘‍♀️',
    desc: '필라테스 해부학 심화',
    certId: 'iipa-pilates-lv2',
    color: '#0EA5A4',
  },
}

export default function SelectCertPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tooltip, setTooltip]             = useState<string | null>(null)
  const [certs, setCerts]                 = useState<CertRow[]>([])
  const [expandedSlug, setExpandedSlug]   = useState<string | null>(null)
  const [existingCertIds, setExistingCertIds] = useState<string[]>([])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated') { router.replace('/landing'); return }

    track('cert_page_viewed')

    if (isSupabaseConfigured) {
      supabase
        .from('certifications')
        .select('id, slug, name, is_active')
        .then(({ data }) => {
          if (data) {
            const seen = new Set<string>()
            const unique = (data as CertRow[]).filter(c => {
              if (HIDDEN_CERT_IDS.includes(c.id)) return false
              if (seen.has(c.slug)) return false
              seen.add(c.slug)
              return true
            })
            setCerts(unique)
          }
        })
    }
  }, [status, router])

  useEffect(() => {
    if (!session?.user?.id) return
    supabase
      .from('user_certifications')
      .select('cert_id')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .then(({ data }) => {
        if (data) setExistingCertIds(data.map((d: { cert_id: string }) => d.cert_id))
      })
  }, [session])

  const handleSelect = (slug: string) => {
    const certId = CERT_META[slug]?.certId ?? slug

    if (existingCertIds.includes(certId)) {
      showTooltip('이미 추가된 자격증입니다 ✓')
      return
    }

    track('cert_selected', { cert: slug })
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
          {tooltip}
        </div>
      )}

      <div className="p-4 space-y-3">

        {/* ── 활성 자격증 카드 ── */}
        {certs.filter(c => c.is_active).map((cert) => {
          const meta = CERT_META[cert.slug]
          const icon = meta?.icon ?? '📋'
          const desc = meta?.desc ?? ''
          const color = meta?.color ?? '#6B6B6B'

          // 2급 생활스포츠지도사: 드롭다운 토글 카드
          if (cert.slug === 'sport_instructor_lv2') {
            const isOpen = expandedSlug === cert.slug
            return (
              <div key={cert.slug} className="w-full">
                <button
                  onClick={() => setExpandedSlug(isOpen ? null : cert.slug)}
                  className={`w-full bg-white p-5 text-left flex items-center gap-4 transition-all border-2 ${
                    isOpen
                      ? 'rounded-t-2xl border-[#2563EB] border-b-0'
                      : 'rounded-2xl border-[#E5E5E5] active:bg-[#F5F5F3]'
                  }`}
                >
                  <div className="text-[36px] flex-shrink-0">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[16px] font-black text-[#1A1A1A]">{cert.name}</span>
                    </div>
                    <p className="text-[12px] text-[#6B6B6B]">{desc}</p>
                  </div>
                  <ChevronDown
                    size={18}
                    className={`text-[#ADADAD] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div className="bg-white border-2 border-t-[1px] border-[#2563EB] rounded-b-2xl overflow-hidden divide-y divide-[#F0F0EE]">
                    <button
                      onClick={() => showTooltip('2급 생활스포츠지도사 필기는 준비 중입니다')}
                      className="w-full px-5 py-4 flex items-center gap-3 text-left opacity-40 cursor-not-allowed"
                    >
                      <span className="text-[22px] flex-shrink-0">📝</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-[#1A1A1A]">필기</p>
                        <p className="text-[11px] text-[#6B6B6B]">준비 중</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E5E5E5] text-[#ADADAD]">Coming Soon</span>
                    </button>
                    <button
                      onClick={() => handleSelect('sports-instructor-2-practical')}
                      className="w-full px-5 py-4 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
                    >
                      <span className="text-[22px] flex-shrink-0">🏋️</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-bold text-[#1A1A1A]">구술/실기</p>
                        <p className="text-[11px] text-[#6B6B6B]">보디빌딩</p>
                      </div>
                      <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
                    </button>
                  </div>
                )}
              </div>
            )
          }

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
        })}

        {/* ── 준비 중 섹션 ── */}
        <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider px-1 pt-1">준비 중</p>

        {certs.filter(c => !c.is_active).map((cert) => {
          const meta = CERT_META[cert.slug]
          const icon = meta?.icon ?? '📋'
          const desc = meta?.desc ?? ''
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
