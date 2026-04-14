import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

// ================================================================
// NextAuth 설정 — Google OAuth 2.0
// JWT 만료: 24시간 / Refresh: 7일
// 최소 스코프: email + profile 만 요청
// ================================================================

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          // 최소 권한 스코프만 요청
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],

  // JWT 전략 사용 (Supabase DB 세션 대신)
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,         // 24시간
    updateAge: 60 * 60,           // 1시간마다 갱신
  },

  jwt: {
    maxAge: 24 * 60 * 60,         // Access Token: 24시간
  },

  callbacks: {
    // JWT 토큰 생성/갱신 시
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          googleId: account.providerAccountId,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          // Refresh Token 유효기간: 7일
          refreshTokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
        }
      }
      // Access token 만료 전이면 그대로 반환
      if (Date.now() < (token.refreshTokenExpiry as number ?? 0)) {
        return token
      }
      // Refresh Token 만료 시 재로그인 요구
      return { ...token, error: 'RefreshTokenExpired' }
    },

    // Session에 노출할 최소 정보만 포함
    async session({ session, token }) {
      session.user = {
        name: session.user?.name ?? null,
        email: session.user?.email ?? null,
        image: session.user?.image ?? null,
      }
      // 에러 상태 전달
      if (token.error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session as any).error = token.error
      }
      return session
    },

    // 리다이렉트 URL 검증
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    },
  },

  pages: {
    signIn: '/landing',
    error: '/landing?auth_error=1',
  },

  // CSRF 보호 활성화
  secret: process.env.NEXTAUTH_SECRET,

  // 이벤트 훅 (로그 목적)
  events: {
    async signIn({ user }) {
      // Production: 로그인 이벤트 기록
      console.log('[Auth] Sign in:', user.email)
    },
    async signOut() {
      console.log('[Auth] Sign out')
    },
  },

  // 디버그 (개발 환경만)
  debug: process.env.NODE_ENV === 'development',
}
