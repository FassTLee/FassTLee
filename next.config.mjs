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
    ],
    // 외부 이미지 최적화 비활성화 (보안)
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
  experimental: {
    serverComponentsExternalPackages: ['next-auth'],
  },
}

export default nextConfig
