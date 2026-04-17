import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { OAuthConfig } from 'next-auth/providers/oauth'

// ================================================================
// NextAuth 설정 — Google + Kakao OAuth
// JWT 만료: 24시간 / Refresh: 7일
// ================================================================

// 카카오 커스텀 프로바이더 (NextAuth v4 내장 없음)
interface KakaoProfile {
  id: number
  kakao_account?: {
    email?: string
    profile?: {
      nickname?: string
      profile_image_url?: string
    }
  }
}

const KakaoProvider: OAuthConfig<KakaoProfile> = {
  id: 'kakao',
  name: 'Kakao',
  type: 'oauth',
  authorization: {
    url: 'https://kauth.kakao.com/oauth/authorize',
    params: { scope: 'profile_nickname profile_image account_email' },
  },
  token: 'https://kauth.kakao.com/oauth/token',
  userinfo: 'https://kapi.kakao.com/v2/user/me',
  profile(profile: KakaoProfile) {
    return {
      id: String(profile.id),
      name: profile.kakao_account?.profile?.nickname ?? null,
      email: profile.kakao_account?.email ?? null,
      image: profile.kakao_account?.profile?.profile_image_url ?? null,
    }
  },
  clientId: process.env.KAKAO_CLIENT_ID!,
  clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
  checks: ['state'],
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
    KakaoProvider,
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
