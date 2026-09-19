import { signIn as nextAuthSignIn, type SignInOptions } from 'next-auth/react'

export function kakaoSignIn(options?: SignInOptions) {
  const isDesktop = typeof navigator !== 'undefined'
    && !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|KAKAOTALK/i.test(navigator.userAgent)

  if (isDesktop) {
    return nextAuthSignIn('kakao', options, { prompt: 'select_account' })
  }

  return nextAuthSignIn('kakao', options)
}
