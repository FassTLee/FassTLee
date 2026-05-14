import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'
import NaverProvider from 'next-auth/providers/naver'
import { supabaseAdmin, isSupabaseAdminConfigured } from '@/lib/supabase-admin'
import { v5 as uuidv5 } from 'uuid'

const UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

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
    NaverProvider({
      clientId:     process.env.NAVER_CLIENT_ID     ?? '',
      clientSecret: process.env.NAVER_CLIENT_SECRET ?? '',
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
    async signIn({ user, account }) {
      try {
        console.log('[signIn callback 실행됨]', account?.provider, account?.providerAccountId)
        const stableUUID = uuidv5(`${account?.provider}:${account?.providerAccountId}`, UUID_NAMESPACE)
        const { error } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id:         stableUUID,
            email:      user.email  ?? null,
            name:       user.name   ?? null,
            avatar_url: user.image  ?? null,
            role:       'member',
          }, { onConflict: 'id' })
        console.log('[upsert 결과]', error)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(user as any).stableId = stableUUID
        return true
      } catch (e) {
        console.error('[signIn callback 오류]', e)
        return true
      }
    },

    async jwt({ token, user, account }) {
      if (account && user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stableId = (user as any).stableId as string | undefined

        // email로 profiles에서 Supabase UUID 조회 (fallback)
        let supabaseId: string | null = stableId ?? null
        if (!supabaseId && isSupabaseAdminConfigured && user.email) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('email', user.email)
            .single()
          supabaseId = profile?.id ?? null
          console.log(`[Auth] jwt supabaseId=${supabaseId} email=${user.email}`)
        }

        if (stableId) token.userId = stableId

        return {
          ...token,
          provider:           account.provider,
          providerAccountId:  account.providerAccountId,
          supabaseId,
          userId:             stableId ?? supabaseId ?? token.sub,
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
        id:       (token.userId as string | null) ?? (token.supabaseId as string | null) ?? token.sub ?? '',
        name:     session.user?.name           ?? null,
        email:    session.user?.email          ?? null,
        image:    session.user?.image          ?? null,
        provider: (token.provider as string)   ?? null,
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
