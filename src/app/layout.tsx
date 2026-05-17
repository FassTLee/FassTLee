import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Analytics } from "@vercel/analytics/next"
import Script from 'next/script'

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

  // 파비콘
  icons: {
    icon: [
      { url: '/assets/icons/app/icon-favicon-32.svg', type: 'image/svg+xml', sizes: 'any' },
      { url: '/assets/icons/app/icon-192.svg',        type: 'image/svg+xml', sizes: '192x192' },
    ],
    apple: [
      { url: '/assets/icons/app/icon-192.svg', sizes: '192x192' },
    ],
  },

  // PWA
  manifest: '/manifest.json',

  // iOS PWA
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Kinepia',
    startupImage: [
      { url: '/icon-512.png' },
    ],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00A651',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <head>
        {/* OAuth 제공자 도메인 사전 연결 — 로그인 redirect 지연 단축 */}
        <link rel="dns-prefetch" href="//kauth.kakao.com" />
        <link rel="preconnect" href="https://kauth.kakao.com" />
        <link rel="dns-prefetch" href="//accounts.google.com" />
        <link rel="dns-prefetch" href="//nid.naver.com" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Analytics />
        <Script src="//t1.kakaocdn.net/kas/static/ba.min.js" strategy="afterInteractive" />
      </body>
    </html>
  )
}
