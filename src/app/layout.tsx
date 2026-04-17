import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

// SessionProvider(next-auth/react)가 SSG 중 React 훅 컨텍스트 없이 실행되는
// 문제를 방지하기 위해 모든 페이지를 동적(SSR) 렌더링으로 전환
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Kinepia',
  description: '움직임의 원리를 배우는 지식 플랫폼',
  applicationName: 'Kinepia',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body><Providers>{children}</Providers></body>
    </html>
  )
}
