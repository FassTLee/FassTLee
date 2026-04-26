import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

// SessionProvider(next-auth/react)가 SSG 중 React 훅 컨텍스트 없이 실행되는
// 문제를 방지하기 위해 모든 페이지를 동적(SSR) 렌더링으로 전환
export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kinepia-rho.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Kinepia — 트레이너를 위한 전문 지식 플랫폼',
    template: '%s | Kinepia',
  },
  description: '기초 해부학부터 컨디셔닝 실습까지, 게이미피케이션으로 즐겁게 배우는 트레이너 전문 지식 플랫폼',
  applicationName: 'Kinepia',
  keywords: ['트레이너', '해부학', '기능해부학', '교차증후군', '컨디셔닝', '자격증'],
  authors: [{ name: 'Kinepia' }],

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: BASE_URL,
    siteName: 'Kinepia',
    title: 'Kinepia — 트레이너를 위한 전문 지식 플랫폼',
    description: '기초 해부학부터 컨디셔닝 실습까지, 게이미피케이션으로 즐겁게 배우는 트레이너 전문 지식 플랫폼',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Kinepia',
      },
    ],
  },

  // Twitter / 카카오 공유
  twitter: {
    card: 'summary_large_image',
    title: 'Kinepia — 트레이너를 위한 전문 지식 플랫폼',
    description: '기초 해부학부터 컨디셔닝 실습까지, 게이미피케이션으로 즐겁게 배우는 트레이너 전문 지식 플랫폼',
    images: ['/og-image.png'],
  },

  // 파비콘 (App Router: src/app/icon.png 자동 인식)
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png', sizes: '64x64' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
    ],
  },

  // PWA
  manifest: undefined,
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1A1A1A',
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
