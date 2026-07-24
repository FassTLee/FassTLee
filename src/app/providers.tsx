'use client'

import { useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  // 서비스워커 등록 (PWA 설치 요건) — 프로덕션에서만, 미지원 환경 가드, 실패는 조용히 무시
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] registration failed:', err)
    })
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
