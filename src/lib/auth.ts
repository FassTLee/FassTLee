import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import type { OAuthConfig } from 'next-auth/providers/oauth'

// ================================================================
// NextAuth 설정 — Google + Kakao OAuth
// JWT 만료: 24시간 / Refresh: 7일
// ================================================================

interface KakaoProfile {
  id: number
  kakao_account?: {
    email?: string
    profile?: {
      nickname?: string
      profile_image_url?: string
      thumbnail_image_url?: string
    }
  }
}

// 런타임 env 검증 (Vercel 함수 로그에서 확인 가능)
console.log('[Auth] KAKAO_CLIENT_ID:', process.env.KAKAO_CLIENT_ID ? '설정됨' : 'NULL')
console.log('[Auth] KAKAO_CLIENT_SECRET:', process.env.KAKAO_CLIENT_SECRET ? '설정됨' : 'NULL')
if (!process.env.KAKAO_CLIENT_ID) {
  console.error('[Auth] KAKAO_CLIENT_ID is not set')
}
if (!process.env.KAKAO_CLIENT_SECRET) {
  console.error('[Auth] KAKAO_CLIENT_SECRET is not set')
}

const KakaoProvider: OAuthConfig<KakaoProfile> = {
  id: 'kakao',
  name: 'Kakao',
  type: 'oauth',
  authorization: {
    url: 'https://kauth.kakao.com/oauth/authorize',
    params: { scope: 'profile_nickname profile_image' },
  },
  token: 'https://kauth.kakao.com/oauth/token',
  userinfo: 'https://kapi.kakao.com/v2/user/me',
  profile(profile: KakaoProfile) {
    const id = String(profile.id)
    return {
      id,
      name:  profile.kakao_account?.profile?.nickname  ?? '카카오 사용자',
      email: profile.kakao_account?.email              ?? `kakao_${id}@kinepia.local`,
      image: profile.kakao_account?.profile?.profile_image_url ?? null,
    }
  },
  clientId:     process.env.KAKAO_CLIENT_ID!,
  clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
  // checks 제거: 커스텀 Provider에서 state 쿠키 타이밍 이슈 방지
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:         'openid email profile',
          prompt:        'consent',
          access_type:   'offline',
          response_type: 'code',
        },
      },
    }),
    KakaoProvider,
  ],

  session: {
    strategy: 'jwt',
    maxAge:     24 * 60 * 60,  // 24시간
    updateAge:       60 * 60,  // 1시간마다 갱신
  },

  jwt: {
    maxAge: 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // 최초 로그인: account + user 모두 존재
      if (account && user) {
        return {
          ...token,
          provider:            account.provider,
          providerAccountId:   account.providerAccountId,
          accessToken:         account.access_token,
          refreshToken:        account.refresh_token ?? null,
          refreshTokenExpiry:  Date.now() + 7 * 24 * 60 * 60 * 1000,
        }
      }

      // 세션 갱신: refreshTokenExpiry 가 남아있으면 그대로 사용
      const expiry = token.refreshTokenExpiry as number | undefined
      if (!expiry || Date.now() < expiry) {
        return token
      }

      // 만료 → 재로그인 유도 (소셜 로그인은 자동 갱신 없음)
      return { ...token, error: 'RefreshTokenExpired' }
    },

    async session({ session, token }) {
      session.user = {
        name:  session.user?.name  ?? null,
        email: session.user?.email ?? null,
        image: session.user?.image ?? null,
      }
      if (token.error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(session as any).error = token.error
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // 상대경로
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // 동일 origin
      try {
        if (new URL(url).origin === baseUrl) return url
      } catch {
        // URL 파싱 실패 시 baseUrl 반환
      }
      return baseUrl
    },
  },

  pages: {
    signIn: '/landing',
    error:  '/landing?auth_error=1',
  },

  secret: process.env.NEXTAUTH_SECRET,

  events: {
    async signIn({ user, account }) {
      console.log(`[Auth] signIn provider=${account?.provider} email=${user.email}`)
    },
    async signOut() {
      console.log('[Auth] signOut')
    },
  },

  debug: false,
}
