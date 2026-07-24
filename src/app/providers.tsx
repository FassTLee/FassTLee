'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { SessionProvider } from 'next-auth/react'

// ── beforeinstallprompt 이벤트 타입 (표준 lib.dom에 없음) ──────────────
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PwaInstallContextValue {
  // deferredPrompt 보유 여부
  canInstall: boolean
  // 이미 설치되어 standalone으로 실행 중인지
  isStandalone: boolean
  // 보관한 이벤트의 prompt() 호출 후 userChoice 반환. 호출 후 보관값은 비운다.
  promptInstall: () => Promise<{ outcome: 'accepted' | 'dismissed' } | null>
}

const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  isStandalone: false,
  promptInstall: async () => null,
})

export function usePwaInstall(): PwaInstallContextValue {
  return useContext(PwaInstallContext)
}

// beforeinstallprompt는 페이지 진입 직후 임의 화면에서 발생하므로 전역(루트)에서 잡아 보관한다.
function PwaInstallProvider({ children }: { children: React.ReactNode }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)

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
    return { outcome: choice.outcome }
  }, [deferred])

  return (
    <PwaInstallContext.Provider value={{ canInstall: deferred !== null, isStandalone, promptInstall }}>
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
