'use client'

import { getLevelName } from '@/types/education'

interface LevelBadgeProps {
  level: number
  compact?: boolean
}

function getLevelColor(level: number): string {
  if (level >= 16) return '#E24B4A'
  if (level >= 11) return '#9B59B6'
  if (level >= 6)  return '#639922'
  return '#378ADD'
}

function getLevelIcon(level: number): string {
  if (level >= 16) return '👑'
  if (level >= 11) return '🏆'
  if (level >= 6)  return '🎯'
  return '📖'
}

export function LevelBadge({ level, compact = false }: LevelBadgeProps) {
  const color = getLevelColor(level)
  const icon = getLevelIcon(level)
  const name = getLevelName(level)

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
        style={{ backgroundColor: color + '15', border: `1px solid ${color}30` }}
      >
        <span className="text-[13px]">{icon}</span>
        <span className="text-[12px] font-bold" style={{ color }}>Lv.{level}</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border"
      style={{ backgroundColor: color + '10', borderColor: color + '30' }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-[22px]"
        style={{ backgroundColor: color + '20' }}
      >
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
          Level {level}
        </div>
        <div className="text-[16px] font-bold text-[#1A1A1A]">{name}</div>
      </div>
    </div>
  )
}
