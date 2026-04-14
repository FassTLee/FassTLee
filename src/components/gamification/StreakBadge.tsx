'use client'

interface StreakBadgeProps {
  streakDays: number
  compact?: boolean
}

export function StreakBadge({ streakDays, compact = false }: StreakBadgeProps) {
  const isBroken = streakDays === 0
  const isWarning = streakDays > 0 && streakDays < 3

  if (compact) {
    return (
      <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full ${
        isBroken ? 'bg-[#F5F5F3]' : 'bg-[#FFF3E0]'
      }`}>
        <span className="text-[14px]">{isBroken ? '❄️' : '🔥'}</span>
        <span className={`text-[12px] font-bold ${
          isBroken ? 'text-[#ADADAD]' : 'text-[#E24B4A]'
        }`}>
          {streakDays}일
        </span>
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
      isBroken
        ? 'bg-[#F5F5F3] border-[#E5E5E5]'
        : isWarning
        ? 'bg-[#FFF3E0] border-[#FFD580]'
        : 'bg-[#FFF3E0] border-[#FF9800]/30'
    }`}>
      <div className="text-[28px]">{isBroken ? '❄️' : '🔥'}</div>
      <div className="flex-1">
        <div className={`text-[18px] font-bold ${isBroken ? 'text-[#ADADAD]' : 'text-[#E24B4A]'}`}>
          {streakDays}일 연속
        </div>
        <div className="text-[12px] text-[#6B6B6B]">
          {isBroken
            ? '오늘 학습을 시작하세요!'
            : isWarning
            ? '⚠️ 오늘 학습하지 않으면 스트릭이 끊겨요!'
            : `${streakDays >= 30 ? '🌋 전설의 스트릭!' : streakDays >= 7 ? '💪 훌륭해요!' : '계속 유지하세요!'}`
          }
        </div>
      </div>
      {streakDays >= 7 && (
        <div className="text-[11px] font-bold text-[#FF9800] bg-[#FF9800]/10 px-2 py-0.5 rounded-full">
          {streakDays >= 30 ? '🌋 30일' : '🔥 7일'}
        </div>
      )}
    </div>
  )
}
