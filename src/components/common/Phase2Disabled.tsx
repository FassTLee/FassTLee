'use client'

import { useRouter } from 'next/navigation'
import { Lock, ArrowLeft } from 'lucide-react'

interface Phase2DisabledProps {
  featureName: string
}

export function Phase2Disabled({ featureName }: Phase2DisabledProps) {
  const router = useRouter()
  return (
    <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-[#E5E5E5]">
        <div className="w-16 h-16 bg-[#F5F5F3] rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock size={28} className="text-[#ADADAD]" />
        </div>
        <div className="text-[11px] font-bold text-[#E24B4A] uppercase tracking-widest mb-2">Phase 2 기능</div>
        <h2 className="text-[20px] font-bold text-[#1A1A1A] mb-3">{featureName}</h2>
        <p className="text-[14px] text-[#6B6B6B] leading-relaxed mb-6">
          이 기능은 MVP 이후 Phase 2에서 제공될 예정입니다.<br />
          현재는 Education 기능을 먼저 체험해 보세요!
        </p>
        <div className="space-y-2">
          <button
            onClick={() => router.push('/trainer/education')}
            className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-xl text-[14px] font-semibold"
          >
            Education 바로가기
          </button>
          <button
            onClick={() => router.back()}
            className="w-full py-3 flex items-center justify-center gap-2 text-[13px] text-[#6B6B6B]"
          >
            <ArrowLeft size={14} /> 뒤로가기
          </button>
        </div>
      </div>
    </div>
  )
}
