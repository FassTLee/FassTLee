'use client'

import { useState } from 'react'

interface LeaderboardEntry {
  rank: number
  name: string
  avatarUrl?: string
  weeklyXP: number
  monthlyXP: number
  level: number
  isMe?: boolean
}

interface LeaderboardProps {
  entries: LeaderboardEntry[]
  myRank?: number
}

const MOCK_ENTRIES: LeaderboardEntry[] = [
  { rank: 1, name: '김지훈 트레이너', weeklyXP: 320, monthlyXP: 1240, level: 12 },
  { rank: 2, name: '이수진 트레이너', weeklyXP: 295, monthlyXP: 1180, level: 11 },
  { rank: 3, name: '박민준 트레이너', weeklyXP: 270, monthlyXP: 1050, level: 10 },
  { rank: 4, name: '최유진 트레이너', weeklyXP: 240, monthlyXP: 980, level: 9 },
  { rank: 5, name: '한소희 트레이너', weeklyXP: 210, monthlyXP: 860, level: 8 },
  { rank: 6, name: '정현우 트레이너', weeklyXP: 185, monthlyXP: 740, level: 7 },
  { rank: 7, name: '강다은 트레이너', weeklyXP: 160, monthlyXP: 620, level: 7 },
  { rank: 8, name: '윤서준 트레이너', weeklyXP: 140, monthlyXP: 560, level: 6 },
  { rank: 9, name: '임나연 트레이너', weeklyXP: 125, monthlyXP: 500, level: 6 },
  { rank: 10, name: '오준혁 트레이너', weeklyXP: 110, monthlyXP: 440, level: 5 },
]

const MY_ENTRY: LeaderboardEntry = {
  rank: 14,
  name: '나 (박트레이너)',
  weeklyXP: 75,
  monthlyXP: 300,
  level: 3,
  isMe: true,
}

const RANK_COLORS: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' }
const RANK_EMOJIS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export function Leaderboard({ entries = MOCK_ENTRIES, myRank = MY_ENTRY.rank }: LeaderboardProps) {
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly')

  const renderEntry = (entry: LeaderboardEntry, isMe = false) => {
    const xp = tab === 'weekly' ? entry.weeklyXP : entry.monthlyXP
    const isTop3 = entry.rank <= 3
    return (
      <div
        key={entry.rank}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
          isMe
            ? 'bg-[#E24B4A]/5 border-[#E24B4A]/30'
            : 'bg-white border-[#E5E5E5]'
        }`}
      >
        {/* Rank */}
        <div className="w-8 text-center">
          {isTop3
            ? <span className="text-[20px]">{RANK_EMOJIS[entry.rank]}</span>
            : <span className={`text-[14px] font-bold ${isMe ? 'text-[#E24B4A]' : 'text-[#ADADAD]'}`}>
                {entry.rank}
              </span>
          }
        </div>
        {/* Avatar */}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
          style={{ backgroundColor: isTop3 ? RANK_COLORS[entry.rank] : isMe ? '#E24B4A' : '#CCCCCC' }}
        >
          {entry.name[0]}
        </div>
        {/* Name & Level */}
        <div className="flex-1 min-w-0">
          <div className={`text-[13px] font-semibold truncate ${isMe ? 'text-[#E24B4A]' : 'text-[#1A1A1A]'}`}>
            {entry.name} {isMe && '(나)'}
          </div>
          <div className="text-[11px] text-[#ADADAD]">Lv.{entry.level}</div>
        </div>
        {/* XP */}
        <div className="text-right">
          <div className={`text-[14px] font-bold ${isTop3 ? 'text-[#E24B4A]' : 'text-[#1A1A1A]'}`}>
            {xp.toLocaleString()}
          </div>
          <div className="text-[10px] text-[#ADADAD]">XP</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Tab */}
      <div className="flex bg-[#F5F5F3] rounded-xl p-1 gap-1">
        {(['weekly', 'monthly'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t ? 'bg-white shadow-sm text-[#1A1A1A]' : 'text-[#ADADAD]'
            }`}
          >
            {t === 'weekly' ? '주간' : '월간'}
          </button>
        ))}
      </div>

      {/* TOP 10 */}
      <div className="space-y-2">
        {entries.map((e) => renderEntry(e))}
      </div>

      {/* Separator */}
      {myRank && myRank > 10 && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-dashed border-dashed border-t border-[#E5E5E5]" />
          <span className="text-[11px] text-[#ADADAD]">···</span>
          <div className="flex-1 h-px border-dashed border-t border-[#E5E5E5]" />
        </div>
      )}

      {/* My rank */}
      {myRank && myRank > 10 && renderEntry(MY_ENTRY, true)}
    </div>
  )
}
