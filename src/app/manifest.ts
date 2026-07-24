import type { MetadataRoute } from 'next'

// PWA 설치 매니페스트 — /manifest.webmanifest 로 서빙됨
// 아이콘 실제 경로: public/assets/icons/app/PWA/ (PWA 대문자, Vercel 대소문자 구분)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kinepia',
    short_name: 'Kinepia',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: 'ko',
    orientation: 'portrait',
    background_color: '#171A1E',
    theme_color: '#00A651',
    icons: [
      {
        src: '/assets/icons/app/PWA/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        // Next.js 14 타입은 purpose를 단일 키워드로만 정의하나, 웹 매니페스트 스펙은
        // 공백 결합값을 허용한다. 런타임 출력은 "any maskable"로 유지.
        // @ts-expect-error space-separated purpose is valid per spec, narrow in Next 14 types
        purpose: 'any maskable',
      },
      {
        src: '/assets/icons/app/PWA/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        // @ts-expect-error space-separated purpose is valid per spec, narrow in Next 14 types
        purpose: 'any maskable',
      },
    ],
  }
}
