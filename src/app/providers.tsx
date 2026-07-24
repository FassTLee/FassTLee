'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { SessionProvider } from 'next-auth/react'

// ── beforeinstallprompt 이벤트 타입 (표준 lib.dom에 없음) ──────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

// ── 설치 배너 쿨다운 전용 localStorage 키 2개 (다른 키는 읽지도 쓰지도 않는다) ──
const DISMISSED_AT_KEY  = 'kinepia_pwa_dismissed_at'   // 마지막 거절 시각 (epoch ms 문자열)
const DISMISS_COUNT_KEY = 'kinepia_pwa_dismiss_count'  // 누적 거절 횟수 (정수 문자열)

const MAX_DISMISS = 2
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000 // 14일

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

interface PwaInstallContextValue {
  // deferredPrompt 보유 여부
  canInstall: boolean
  // 이미 설치되어 standalone으로 실행 중인지
  isStandalone: boolean
  // 쿨다운 통과 여부 (거절 2회/14일 규칙) — 배너 노출 판정의 단일 소스
  cooldownOk: boolean
  // 보관한 이벤트의 prompt() 호출 후 userChoice 반환. 호출 후 보관값은 비운다.
  promptInstall: () => Promise<{ outcome: 'accepted' | 'dismissed' } | null>
  // "나중에"/X — 거절 기록 갱신 후 숨김 (쿨다운 state 갱신)
  dismissBanner: () => void
}

const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  isStandalone: false,
  cooldownOk: false,
  promptInstall: async () => null,
  dismissBanner: () => {},
})

export function usePwaInstall(): PwaInstallContextValue {
  return useContext(PwaInstallContext)
}

// beforeinstallprompt는 페이지 진입 직후 임의 화면에서 발생하므로 전역(루트)에서 잡아 보관한다.
// 배너 노출에 필요한 가변 상태(deferred/standalone/cooldown)를 여기 한 곳에 두어,
// 배너와 소비 측(예: 리포트 컨테이너 여백)이 같은 값을 쓰도록 단일 소스로 만든다.
function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  // localStorage 접근은 클라이언트에서만 — 초기 false로 두고 마운트 후 평가(하이드레이션 안전)
  const [cooldownOk, setCooldownOk] = useState(false)

  useEffect(() => {
    // SSR 가드 — window 미존재 환경에서 접근하지 않음
    if (typeof window === 'undefined') return

    const detectStandalone = () => {
      const mm = window.matchMedia?.('(display-mode: standalone)').matches ?? false
      // iOS Safari 전용 플래그
      const iosStandalone =
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true
      setIsStandalone(Boolean(mm || iosStandalone))
    }
    detectStandalone()
    setCooldownOk(cooldownPassed())

    const onBeforeInstallPrompt = (e: Event) => {
      // 브라우저 기본 미니 인포바 억제 후 이벤트 보관
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onAppInstalled = () => {
      // 설치 완료 — 보관값 비우고 standalone으로 표시
      setDeferred(null)
      setIsStandalone(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return null
    await deferred.prompt()
    const choice = await deferred.userChoice
    // prompt()는 1회성 — 결과와 무관하게 보관값을 비운다
    setDeferred(null)
    if (choice.outcome === 'accepted') {
      // 설치 수락 — 쿨다운 키 정리
      try {
        localStorage.removeItem(DISMISS_COUNT_KEY)
        localStorage.removeItem(DISMISSED_AT_KEY)
      } catch {
        // 무시
      }
    }
    // 노출 판정 즉시 갱신 (deferred=null로도 canInstall이 false가 되지만 명시적으로 닫음)
    setCooldownOk(cooldownPassed())
    return { outcome: choice.outcome }
  }, [deferred])

  const dismissBanner = useCallback(() => {
    try {
      const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) ?? '0', 10) || 0
      localStorage.setItem(DISMISS_COUNT_KEY, String(count + 1))
      localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
    } catch {
      // localStorage 미가용 — 무시
    }
    setCooldownOk(false)
  }, [])

  return (
    <PwaInstallContext.Provider
      value={{ canInstall: deferred !== null, isStandalone, cooldownOk, promptInstall, dismissBanner }}
    >
      {children}
    </PwaInstallContext.Provider>
  )
}

export function Providers({ children }: { children: React.ReactNode }) {
  // 서비스워커 등록 (PWA 설치 요건) — 프로덕션에서만, 미지원 환경 가드, 실패는 조용히 무시
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] registration failed:', err)
    })
  }, [])

  return (
    <SessionProvider>
      <PwaInstallProvider>{children}</PwaInstallProvider>
    </SessionProvider>
  )
}
