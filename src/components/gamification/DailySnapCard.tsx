'use client'

import { useRouter } from 'next/navigation'
import { Play, CheckCircle2 } from 'lucide-react'

interface DailySnapCardProps {
  title: string
  category: string
  categoryColor: string
  durationMinutes: number
  xpReward: number
  completed: boolean
  lessonId: string
  courseId: string
}

export function DailySnapCard({
  title,
  category,
  categoryColor,
  durationMinutes,
  xpReward,
  completed,
  lessonId,
  courseId,
}: DailySnapCardProps) {
  const router = useRouter()

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        completed
          ? 'bg-[#F5F5F3] border-[#E5E5E5] opacity-70'
          : 'bg-white border-[#E5E5E5] shadow-sm'
      }`}
    >
      {/* Accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: categoryColor }} />

      <div className="p-4 pt-5">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div
              className="text-[10px] font-bold uppercase tracking-wide mb-1"
              style={{ color: categoryColor }}
            >
              ⚡ 데일리 스냅
            </div>
            <div className="text-[15px] font-bold text-[#1A1A1A] leading-snug">{title}</div>
          </div>
          {completed && (
            <CheckCircle2 size={22} className="text-[#639922] flex-shrink-0 mt-0.5" />
          )}
        </div>

        <div className="flex items-center gap-3 mb-4">
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: categoryColor + '15', color: categoryColor }}
          >
            {category}
          </span>
          <span className="text-[11px] text-[#ADADAD]">⏱ {durationMinutes}분</span>
          <span className="text-[11px] text-[#ADADAD]">⭐ +{xpReward} XP</span>
        </div>

        {!completed ? (
          <button
            onClick={() => router.push(`/trainer/education/${courseId}?lesson=${lessonId}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold text-white"
            style={{ backgroundColor: categoryColor }}
          >
            <Play size={15} /> 오늘의 학습 시작
          </button>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-medium text-[#639922] bg-[#639922]/10">
            <CheckCircle2 size={15} /> 오늘 완료!
          </div>
        )}
      </div>
    </div>
  )
}
