'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { X, Download } from 'lucide-react'
import { usePwaInstall } from '@/app/providers'

// ── 쿨다운 전용 localStorage 키 2개 (다른 키는 읽지도 쓰지도 않는다) ──
const DISMISSED_AT_KEY  = 'kinepia_pwa_dismissed_at'   // 마지막 거절 시각 (epoch ms 문자열)
const DISMISS_COUNT_KEY = 'kinepia_pwa_dismiss_count'  // 누적 거절 횟수 (정수 문자열)

const MAX_DISMISS  = 2
const COOLDOWN_MS  = 14 * 24 * 60 * 60 * 1000 // 14일

// 쿨다운 통과 여부: 거절 2회 이상이면 영구 숨김, 마지막 거절 후 14일 미경과면 숨김
function cooldownPassed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) ?? '0', 10) || 0
    if (count >= MAX_DISMISS) return false
    const at = localStorage.getItem(DISMISSED_AT_KEY)
    if (at) {
      const ts = parseInt(at, 10)
      if (!Number.isNaN(ts) && Date.now() - ts < COOLDOWN_MS) return false
    }
    return true
  } catch {
    return false
  }
}

export function InstallPromptBanner() {
  const { canInstall, isStandalone, promptInstall } = usePwaInstall()
  const { status } = useSession()

  // localStorage 접근은 클라이언트에서만 — 초기 false로 두고 마운트 후 평가(하이드레이션 안전)
  const [cooldownOk, setCooldownOk] = useState(false)
  useEffect(() => {
    setCooldownOk(cooldownPassed())
  }, [])

  // 표시 조건 전부 만족 시에만 렌더 — 하나라도 불충족 시 null
  if (!canInstall) return null
  if (isStandalone) return null
  if (status !== 'authenticated') return null
  if (!cooldownOk) return null

  // "나중에" / X — 거절 기록 갱신 후 숨김
  const handleDismiss = () => {
    try {
      const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) ?? '0', 10) || 0
      localStorage.setItem(DISMISS_COUNT_KEY, String(count + 1))
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
    } catch {
      // localStorage 미가용 — 무시
    }
    setCooldownOk(false)
  }

  // "앱으로 설치" — prompt 결과 accepted면 쿨다운 키 정리
  const handleInstall = async () => {
    const choice = await promptInstall()
    if (choice?.outcome === 'accepted') {
      try {
        localStorage.removeItem(DISMISS_COUNT_KEY)
        localStorage.removeItem(DISMISSED_AT_KEY)
      } catch {
        // 무시
      }
    }
    // prompt는 1회성(deferred 소진). 결과와 무관하게 배너를 닫는다.
    setCooldownOk(false)
  }

  return (
    // 하단 액션 바(≈146px) 위쪽에 쌓이도록 bottom 오프셋. z-[55]: BottomTabBar(z-50)보다 위.
    <div className="fixed inset-x-0 bottom-[160px] z-[55] px-4">
      <div className="relative max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-[#E5E5E5] p-4 pr-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00A651]/10 flex items-center justify-center flex-shrink-0">
          <Download size={20} className="text-[#00A651]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#1A1A1A] leading-snug">앱으로 더 빠르게 학습하세요</p>
          <p className="text-[11px] text-[#6B6B6B] leading-snug">홈 화면에 설치하고 바로 실행</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleDismiss}
            className="text-[12px] font-medium text-[#ADADAD] px-2 py-2"
          >
            나중에
          </button>
          <button
            onClick={handleInstall}
            className="text-[12px] font-bold text-white bg-[#00A651] rounded-xl px-3 py-2"
          >
            앱으로 설치
          </button>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="닫기"
          className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center text-[#CCCCCC]"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
