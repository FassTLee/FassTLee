import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { Analytics } from "@vercel/analytics/next"
import Script from 'next/script'

// SessionProvider(next-auth/react)가 SSG 중 React 훅 컨텍스트 없이 실행되는
// 문제를 방지하기 위해 모든 페이지를 동적(SSR) 렌더링으로 전환
export const dynamic = 'force-dynamic'

const BASE_URL = 'https://kinepia.com'

const TITLE       = 'Kinepia — 국가공인 체육 자격증 학습 플랫폼'
const DESCRIPTION = '건강운동관리사 · 2급 생활스포츠지도사 필기·구술 기출문제와 학습 슬라이드로 합격까지. 체육 지도 전문가의 시작.'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: TITLE,
    template: '%s | Kinepia',
  },
  description: DESCRIPTION,
  applicationName: 'Kinepia',
  keywords: ['건강운동관리사', '2급 생활스포츠지도사', '체육 자격증', '필기 기출', '구술 시험', '자격증 공부', '체육 지도사'],
  authors: [{ name: 'Kinepia' }],

  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: BASE_URL,
    siteName: 'Kinepia',
    title: TITLE,
    description: DESCRIPTION,
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
    title: TITLE,
    description: DESCRIPTION,
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

  // Android Chrome PWA (mobile-web-app-capable)
  other: {
    'mobile-web-app-capable': 'yes',
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
