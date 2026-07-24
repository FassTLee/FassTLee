'use client'

import { useSession } from 'next-auth/react'
import { X, Download } from 'lucide-react'
import { usePwaInstall } from '@/app/providers'

// 배너 노출 판정 — 순수 파생(자체 state 없음). 입력은 전부 공유 소스:
//   canInstall/isStandalone/cooldownOk = PwaInstall Context, status = useSession.
// 배너 컴포넌트와 소비 측(리포트 컨테이너 여백)이 이 훅을 함께 써 동일 값을 보장한다.
export function useInstallBannerVisible(): boolean {
  const { canInstall, isStandalone, cooldownOk } = usePwaInstall()
  const { status } = useSession()
  return canInstall && !isStandalone && status === 'authenticated' && cooldownOk
}

export function InstallPromptBanner() {
  const visible = useInstallBannerVisible()
  const { promptInstall, dismissBanner } = usePwaInstall()

  // 표시 조건 불충족 시 렌더 안 함
  if (!visible) return null

  const handleInstall = async () => {
    // 결과 처리(수락 시 쿨다운 정리)와 노출 갱신은 Context가 담당
    await promptInstall()
  }

  return (
    // 하단 액션 바(≈146px) 위쪽에 쌓이도록 bottom 오프셋. z-[55]: BottomTabBar(z-50)보다 위.
    <div className="fixed inset-x-0 bottom-[160px] z-[55] px-4">
      <div className="relative max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-[#E5E5E5] p-4 pr-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#00A651]/10 flex items-center justify-center flex-shrink-0">
          <Download size={20} className="text-[#00A651]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[#1A1A1A] leading-snug">앱으로 더 빠르게 학습하세요</p>
          <p className="text-[11px] text-[#6B6B6B] leading-snug">홈 화면에 설치하고 바로 실행</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={dismissBanner}
            className="text-[12px] font-medium text-[#ADADAD] px-2 py-2"
          >
            나중에
          </button>
          <button
            onClick={handleInstall}
            className="text-[12px] font-bold text-white bg-[#00A651] rounded-xl px-3 py-2"
          >
            앱으로 설치
          </button>
        </div>
        <button
          onClick={dismissBanner}
          aria-label="닫기"
          className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center text-[#CCCCCC]"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
