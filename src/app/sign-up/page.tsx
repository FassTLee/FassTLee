'use client'

import { useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'

export default function SignUpPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/trainer/dashboard'

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl p-8 border border-[#E5E5E5] shadow-sm">
          <div className="text-center mb-8">
            <div className="text-[40px] mb-3">🎓</div>
            <h1 className="text-[22px] font-black text-[#1A1A1A] mb-2">Kinepia 시작하기</h1>
            <p className="text-[14px] text-[#6B6B6B] leading-relaxed">
              소셜 계정으로 간편하게 가입하고<br />
              전체 학습 콘텐츠를 무료로 시작하세요
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => signIn('google', { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-white border-2 border-[#E5E5E5] rounded-2xl text-[14px] font-semibold text-[#1A1A1A] hover:bg-[#F5F5F3] transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              구글로 계속하기
            </button>

            <button
              onClick={() => signIn('kakao', { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[14px] font-semibold text-[#000000] hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#FEE500' }}
            >
              <span className="text-[16px] font-black leading-none">K</span>
              카카오로 계속하기
            </button>

            {/* 네이버 로그인 */}
            <button
              onClick={() => signIn('naver', { callbackUrl })}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[14px] font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ backgroundColor: '#03C75A' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                <path d="M16.273 12.845L7.376 0H0v24h7.727V11.155L16.624 24H24V0h-7.727z"/>
              </svg>
              네이버로 계속하기
            </button>
          </div>

          <p className="text-[11px] text-[#ADADAD] text-center mt-6 leading-relaxed">
            가입 시 <span className="underline cursor-pointer">이용약관</span> 및{' '}
            <span className="underline cursor-pointer">개인정보처리방침</span>에 동의하게 됩니다
          </p>
        </div>
      </div>
    </div>
  )
}
