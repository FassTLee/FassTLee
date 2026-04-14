'use client'

import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'

// ================================================================
// AdBanner — free 플랜 사용자에게만 광고 표시
// NEXT_PUBLIC_AD_MODE=internal → ad_banners 테이블
// NEXT_PUBLIC_AD_MODE=adsense  → Google AdSense
// ================================================================

interface AdBannerProps {
  position?: string       // ad_banners.position 필터
  _userId?: string | null // null이면 free 플랜으로 간주 (추후 구독 체크에 사용)
  planName?: string       // 'free' | 'pro' | 'premium'
  className?: string
}

interface BannerData {
  id: string
  title: string
  image_url: string
  link_url: string
}

export function AdBanner({
  position = 'dashboard_feed',
  _userId,
  planName = 'free',
  className = '',
}: AdBannerProps) {
  const [banner, setBanner] = useState<BannerData | null>(null)
  const [loading, setLoading] = useState(true)
  const adMode = process.env.NEXT_PUBLIC_AD_MODE ?? 'internal'

  // pro/premium은 광고 표시 안 함
  if (planName === 'pro' || planName === 'premium') return null

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    if (adMode !== 'internal') { setLoading(false); return }

    async function fetchBanner() {
      try {
        const res = await fetch(`/api/ads/banner?position=${position}`)
        if (res.ok) {
          const data = await res.json()
          setBanner(data.banner ?? null)
        }
      } catch {
        // 광고 실패 시 null — 조용히 처리
      } finally {
        setLoading(false)
      }
    }
    fetchBanner()
  }, [position, adMode])

  const handleClick = async (id: string, url: string) => {
    // click_count +1 비동기 처리 (실패해도 무시)
    fetch('/api/ads/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).catch(() => {})

    // 새 탭으로 링크 이동
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (loading) return null

  // ─── AdSense 모드 ──────────────────────────────────────────────
  if (adMode === 'adsense') {
    return (
      <div className={`overflow-hidden rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] ${className}`}>
        <div className="text-[9px] text-[#ADADAD] text-right px-2 pt-1">광고</div>
        {/* Google AdSense 스크립트는 layout.tsx에서 별도 로드 */}
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT}
          data-ad-slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    )
  }

  // ─── Internal 모드 ─────────────────────────────────────────────
  if (!banner) {
    // 배너 없을 때 — FassT 자체 프로모션
    return (
      <button
        onClick={() => window.open('/pricing', '_self')}
        className={`w-full rounded-xl border border-dashed border-[#E24B4A]/40 bg-gradient-to-r from-[#E24B4A]/5 to-[#E24B4A]/10 p-4 text-left ${className}`}
      >
        <div className="text-[9px] text-[#ADADAD] mb-1.5">광고</div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#E24B4A]/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-[18px]">⚡</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-bold text-[#1A1A1A]">FassT 프리미엄 업그레이드</div>
            <div className="text-[11px] text-[#6B6B6B]">광고 없이 모든 강의를 무제한으로</div>
          </div>
          <ExternalLink size={14} className="text-[#ADADAD] flex-shrink-0" />
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={() => handleClick(banner.id, banner.link_url)}
      className={`w-full rounded-xl border border-[#E5E5E5] bg-white overflow-hidden text-left ${className}`}
    >
      <div className="text-[9px] text-[#ADADAD] text-right px-2 pt-1.5 pb-0.5">광고</div>
      {/* 이미지 */}
      <div className="w-full h-24 bg-[#F5F5F3] flex items-center justify-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={banner.image_url}
          alt={banner.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            const t = e.target as HTMLImageElement
            t.style.display = 'none'
          }}
        />
      </div>
      <div className="flex items-center justify-between px-3 py-2.5">
        <span className="text-[12px] font-medium text-[#1A1A1A] truncate">{banner.title}</span>
        <ExternalLink size={13} className="text-[#ADADAD] flex-shrink-0 ml-2" />
      </div>
    </button>
  )
}
