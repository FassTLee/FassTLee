'use client'

import Image from 'next/image'

type LoadingStateProps =
  | {
      status: 'loading'
      message?: string
      onRetry?: never
    }
  | {
      status: 'error'
      message?: never
      onRetry: () => void
    }

export function LoadingState(props: LoadingStateProps) {
  if (props.status === 'error') {
    return (
      <div className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[16px] font-bold text-[#1A1A1A] mb-2">
          네트워크 연결을 확인해주세요
        </p>
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
          인터넷 연결 상태를 확인한 후 다시 시도해주세요.
        </p>
        <button
          type="button"
          onClick={props.onRetry}
          className="min-w-28 px-6 py-3 bg-[#00A651] text-white rounded-2xl text-[14px] font-bold"
        >
          확인
        </button>
      </div>
    )
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-screen bg-[#F5F5F3] flex flex-col items-center justify-center gap-4"
    >
      <div className="kinepia-loading-mark" aria-hidden="true">
        <span className="kinepia-loading-ring" />
        <Image
          src="/assets/icons/app/PWA/icon-192.png"
          alt=""
          width={72}
          height={72}
          priority
          className="kinepia-loading-icon rounded-[22%]"
        />
      </div>
      {props.message && (
        <p className="text-[15px] font-bold text-[#1A1A1A]">{props.message}</p>
      )}
      <span className="sr-only">불러오는 중</span>
    </div>
  )
}
