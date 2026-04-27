import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'

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
    KakaoProvider({
      clientId:     process.env.KAKAO_CLIENT_ID     ?? '',
      clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge:     24 * 60 * 60,
    updateAge:       60 * 60,
  },

  jwt: {
    maxAge: 24 * 60 * 60,
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (account && user) {
        return {
          ...token,
          provider:           account.provider,
          providerAccountId:  account.providerAccountId,
          accessToken:        account.access_token,
          refreshToken:       account.refresh_token ?? null,
          refreshTokenExpiry: Date.now() + 7 * 24 * 60 * 60 * 1000,
        }
      }

      const expiry = token.refreshTokenExpiry as number | undefined
      if (!expiry || Date.now() < expiry) {
        return token
      }

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
      if (url.startsWith('/')) return `${baseUrl}${url}`
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
