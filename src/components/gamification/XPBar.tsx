'use client'

import { getXPForNextLevel } from '@/types/education'

interface XPBarProps {
  xp: number
  level: number
  compact?: boolean
  showAnimation?: boolean
}

export function XPBar({ xp, level, compact = false }: XPBarProps) {
  // Calculate XP within current level
  let baseXP = 0
  for (let l = 1; l < level; l++) baseXP += getXPForNextLevel(l)
  const currentLevelXP = xp - baseXP
  const nextLevelXP = getXPForNextLevel(level)
  const pct = Math.min(100, Math.round((currentLevelXP / nextLevelXP) * 100))

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-bold text-[#1A1A1A]">⭐ {xp} XP</span>
        <div className="flex-1 h-1.5 bg-[#F5F5F3] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#E24B4A] rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] text-[#ADADAD]">Lv.{level}</span>
      </div>
    )
  }

  return (
    <div className="bg-[#F5F5F3] rounded-xl px-4 py-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[16px]">⭐</span>
          <span className="text-[15px] font-bold text-[#1A1A1A]">{currentLevelXP} XP</span>
        </div>
        <span className="text-[12px] text-[#6B6B6B]">다음 레벨까지 {nextLevelXP - currentLevelXP} XP</span>
      </div>
      <div className="w-full h-3 bg-[#E5E5E5] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#E24B4A] to-[#FF7043] rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[11px] text-[#ADADAD]">Lv.{level}</span>
        <span className="text-[11px] text-[#ADADAD]">{pct}%</span>
        <span className="text-[11px] text-[#ADADAD]">Lv.{level + 1}</span>
      </div>
    </div>
  )
}
