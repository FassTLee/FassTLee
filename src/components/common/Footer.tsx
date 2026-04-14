'use client'

import { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface FooterProps {
  onBack?: () => void
  onNext?: () => void
  backLabel?: string
  nextLabel?: string
  center?: ReactNode
  hideBack?: boolean
  hideNext?: boolean
  nextDisabled?: boolean
  nextVariant?: 'primary' | 'ghost'
}

export function Footer({
  onBack,
  onNext,
  backLabel = '이전',
  nextLabel = '다음',
  center,
  hideBack = false,
  hideNext = false,
  nextDisabled = false,
  nextVariant = 'primary',
}: FooterProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 bg-white border-t border-[#E5E5E5]"
      style={{ height: '72px', paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
    >
      {/* Back */}
      <div className="w-20">
        {!hideBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-[14px] text-[#6B6B6B] font-medium"
          >
            <ChevronLeft size={16} />
            {backLabel}
          </button>
        )}
      </div>

      {/* Center */}
      <div className="flex-1 flex justify-center">{center}</div>

      {/* Next */}
      <div className="w-20 flex justify-end">
        {!hideNext && (
          <button
            onClick={onNext}
            disabled={nextDisabled}
            className={`flex items-center gap-1 text-[14px] font-semibold rounded-lg px-3 py-2
              ${nextVariant === 'primary'
                ? 'bg-[#1A1A1A] text-white disabled:opacity-40'
                : 'text-[#1A1A1A] disabled:opacity-40'
              }`}
          >
            {nextLabel}
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
