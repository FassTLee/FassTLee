'use client'

import { BADGE_META } from '@/types/education'

interface BadgeCollectionProps {
  earnedBadges: string[]
  compact?: boolean
}

const ALL_BADGE_TYPES = Object.keys(BADGE_META)

export function BadgeCollection({ earnedBadges, compact = false }: BadgeCollectionProps) {
  if (compact) {
    const earned = ALL_BADGE_TYPES.filter((b) => earnedBadges.includes(b))
    return (
      <div className="flex items-center gap-1">
        {earned.slice(0, 4).map((b) => (
          <span key={b} title={BADGE_META[b]?.name} className="text-[18px]">
            {BADGE_META[b]?.icon}
          </span>
        ))}
        {earned.length > 4 && (
          <span className="text-[11px] text-[#ADADAD] font-medium">+{earned.length - 4}</span>
        )}
        {earned.length === 0 && (
          <span className="text-[12px] text-[#ADADAD]">배지 없음</span>
        )}
      </div>
    )
  }

  return (
    <div className="bg-[#F5F5F3] rounded-xl p-4">
      <div className="text-[13px] font-bold text-[#1A1A1A] mb-3">🎖️ 배지 컬렉션</div>
      <div className="grid grid-cols-3 gap-3">
        {ALL_BADGE_TYPES.map((badgeType) => {
          const meta = BADGE_META[badgeType]
          const earned = earnedBadges.includes(badgeType)
          return (
            <div
              key={badgeType}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                earned
                  ? 'bg-white border-[#E5E5E5] shadow-sm'
                  : 'bg-[#F5F5F3] border-dashed border-[#CCCCCC] opacity-40'
              }`}
            >
              <span className={`text-[24px] ${!earned ? 'grayscale' : ''}`}>{meta?.icon}</span>
              <span className="text-[10px] font-medium text-[#1A1A1A] text-center leading-tight">
                {meta?.name}
              </span>
              {earned && (
                <span className="text-[9px] text-[#639922] font-medium">획득!</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
