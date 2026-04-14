'use client'

import { Lock } from 'lucide-react'
import { Course, CATEGORY_META } from '@/types/education'

interface LockScreenProps {
  course: Course
  onUnlockInfo?: () => void
}

const UNLOCK_MESSAGES: Record<string, string> = {
  'af-02-test-pass': '기능 해부학 중급 테스트 통과 후 해제',
  'af-03-complete': '기능 해부학 상급 완료 후 해제',
  'cm-01-complete': '마사지 기초 완료 후 해제',
  'cs-01-complete': '스트레칭 기초 완료 후 해제',
}

export function LockScreen({ course, onUnlockInfo }: LockScreenProps) {
  const meta = CATEGORY_META[course.category]
  const unlockMsg = course.unlockCondition
    ? UNLOCK_MESSAGES[course.unlockCondition] ?? '이전 단계 완료 후 해제됩니다'
    : '이전 단계 완료 후 해제됩니다'

  return (
    <div
      className="flex flex-col items-center justify-center px-5 py-8 rounded-xl border border-dashed"
      style={{ backgroundColor: meta.bg, borderColor: meta.color + '30' }}
    >
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
        style={{ backgroundColor: meta.color + '15' }}
      >
        <Lock size={24} style={{ color: meta.color }} />
      </div>
      <div className="text-[16px] font-bold text-[#1A1A1A] mb-1">{course.title}</div>
      <div className="text-[12px] text-[#6B6B6B] text-center mb-3">{unlockMsg}</div>
      <div
        className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
        style={{ backgroundColor: meta.color + '15', color: meta.color }}
      >
        🔒 잠금됨
      </div>
      {onUnlockInfo && (
        <button
          onClick={onUnlockInfo}
          className="mt-3 text-[12px] text-[#378ADD] underline"
        >
          해제 방법 보기
        </button>
      )}
    </div>
  )
}
