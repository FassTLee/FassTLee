/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── 보안: 서버 전용 환경변수 노출 방지 ────────────────────────
  // NEXT_PUBLIC_ 없는 키는 자동으로 서버 전용
  // 아래 목록은 절대 클라이언트 번들에 포함되지 않음:
  // SUPABASE_SERVICE_ROLE_KEY, ENCRYPTION_KEY, HASH_SALT
  // NEXTAUTH_SECRET, GOOGLE_CLIENT_SECRET

  // ─── 이미지 도메인 화이트리스트 ────────────────────────────────
  images: {
    domains: [
      'lh3.googleusercontent.com',   // Google 프로필 이미지
      'img1.kakaocdn.net',            // 카카오 프로필 이미지 (주)
      'k.kakaocdn.net',              // 카카오 프로필 이미지 (보조)
      't1.kakaocdn.net',             // 카카오 썸네일 이미지
    ],
    unoptimized: false,
  },

  // ─── 헤더 추가 ─────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Next.js 인라인 스크립트 + 카카오 AdFit + Google OAuth
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://t1.kakaocdn.net https://accounts.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline'",
              // 프로필 이미지(Google·카카오) + AdFit 소재 이미지
              "img-src 'self' data: blob: https://lh3.googleusercontent.com https://img1.kakaocdn.net https://k.kakaocdn.net https://t1.kakaocdn.net https://*.kakaocdn.net https://*.kakao.com",
              "font-src 'self' data:",
              // Supabase REST/Realtime + 카카오 AdFit 트래킹 + Google OAuth
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://serv.ds.kakao.com https://aem-kakao-collector.onkakao.net https://*.kakao.com https://*.kakaocdn.net",
              // AdFit iframe + Google OAuth 팝업
              "frame-src 'self' https://t1.kakaocdn.net https://accounts.google.com",
              "object-src 'none'",
              "base-uri 'self'",
            ].join('; '),
          },
        ],
      },
      // 해부학 이미지 캐시 정책
      {
        source: '/images/anatomy/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
          // 직접 접근 방지 (Referer 체크는 미들웨어에서)
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
        ],
      },
    ]
  },

  // ─── 리다이렉트 ────────────────────────────────────────────────
  async redirects() {
    return [
      // 직관적인 API 경로 차단 (404 대신 리다이렉트)
      {
        source: '/api/education',
        destination: '/api/v1/e8f3a',
        permanent: true,
      },
      {
        source: '/api/test',
        destination: '/api/v1/t4f7e',
        permanent: true,
      },
    ]
  },

  // ─── TypeScript / ESLint 빌드 설정 ─────────────────────────────
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },

  // ─── 실험 기능 ─────────────────────────────────────────────────
  experimental: {},
}

export default nextConfig
