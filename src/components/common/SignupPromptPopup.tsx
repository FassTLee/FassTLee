'use client'

import { signIn } from 'next-auth/react'
import { X } from 'lucide-react'

const GUEST_CLEANUP_KEYS = [
  'kinepia_guest_id',
  'landingTestResult',
  'landingTestQuestions',
  'kinepia_learning_type',
  'kinepia_learning_style',
]

interface Props {
  onClose: () => void
  callbackUrl?: string
}

export function SignupPromptPopup({ onClose, callbackUrl = '/landing/survey' }: Props) {
  const handleDismiss = () => {
    GUEST_CLEANUP_KEYS.forEach((k) => localStorage.removeItem(k))
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4">
        {/* 헤더 */}
        <div className="flex items-start justify-between">
          <div className="text-[32px] leading-none">🔔</div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 flex items-center justify-center text-[#ADADAD]"
          >
            <X size={20} />
          </button>
        </div>

        {/* 메시지 */}
        <div>
          <h2 className="text-[18px] font-black text-[#1A1A1A] mb-1.5">
            결과를 저장하려면 가입이 필요합니다
          </h2>
          <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
            지금 나가면 결과가 사라집니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="space-y-2.5 pt-1">
          {/* 카카오 */}
          <button
            onClick={() => signIn('kakao', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl text-[14px] font-bold text-[#1A1A1A]"
            style={{ backgroundColor: '#FEE500' }}
          >
            <svg width="18" height="18" viewBox="0 0 512 512" fill="#1A1A1A">
              <path d="M256 32C114.6 32 0 125.1 0 240c0 72.3 45.3 136 114.3 174.6-4.9 18.1-18.2 65.4-20.9 75.7-.3.9-.6 2.1.3 2.9.9.8 2 .4 2 .4 2.6-.4 105.5-69.4 115.3-76.1C219.9 419.5 237.7 421 256 421c141.4 0 256-93.1 256-208S397.4 32 256 32z"/>
            </svg>
            카카오로 시작하기
          </button>

          {/* 구글 */}
          <button
            onClick={() => signIn('google', { callbackUrl })}
            className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border-2 border-[#E5E5E5] bg-white text-[14px] font-bold text-[#1A1A1A]"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            구글로 시작하기
          </button>

          {/* 나중에 */}
          <button
            onClick={handleDismiss}
            className="w-full py-3 text-[13px] text-[#ADADAD] font-medium"
          >
            나중에 (결과 삭제)
          </button>
        </div>
      </div>
    </div>
  )
}
