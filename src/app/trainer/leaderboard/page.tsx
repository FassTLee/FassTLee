'use client'

import { useRouter } from 'next/navigation'
import { useEducationStore } from '@/store/educationStore'
import { ChevronLeft } from 'lucide-react'

const MOCK_LEADERBOARD = [
  { rank: 1,  name: '김지훈',  xp: 850,  medal: '🥇' },
  { rank: 2,  name: '이수진',  xp: 720,  medal: '🥈' },
  { rank: 3,  name: '박민서',  xp: 610,  medal: '🥉' },
  { rank: 4,  name: '최도현',  xp: 540,  medal: null  },
  { rank: 5,  name: '정유진',  xp: 490,  medal: null  },
  { rank: 6,  name: '강태양',  xp: 420,  medal: null  },
  { rank: 7,  name: '윤서연',  xp: 380,  medal: null  },
  { rank: 8,  name: '임준혁',  xp: 310,  medal: null  },
  { rank: 9,  name: '한지민',  xp: 270,  medal: null  },
  { rank: 10, name: '오세훈',  xp: 240,  medal: null  },
  { rank: 11, name: '신예은',  xp: 210,  medal: null  },
  { rank: 12, name: '류성현',  xp: 190,  medal: null  },
  { rank: 13, name: '문지아',  xp: 170,  medal: null  },
]

const MY_RANK = 14

export default function LeaderboardPage() {
  const router = useRouter()
  const { gamification } = useEducationStore()
  const myXP = gamification.weeklyXP ?? 0
  const top10XP = MOCK_LEADERBOARD[9]?.xp ?? 0
  const xpToTop10 = Math.max(0, top10XP - myXP + 1)

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex flex-col">

      {/* 헤더 */}
      <div className="bg-white border-b border-[#E5E5E5] px-5 pt-12 pb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[13px] text-[#6B6B6B] mb-3"
        >
          <ChevronLeft size={16} /> 대시보드
        </button>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-[#00A651] tracking-widest uppercase mb-0.5">Kinepia</p>
            <h1 className="text-[22px] font-black text-[#1A1A1A]">주간 리더보드</h1>
          </div>
          <span className="text-[11px] text-[#ADADAD]">매주 월 초기화</span>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3">

        {/* 내 순위 요약 카드 */}
        <div className="bg-[#1A1A1A] rounded-2xl px-5 py-4 flex items-center gap-4">
          <span className="text-[32px]">🏆</span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-white/50 mb-0.5">이번 주 나의 순위</p>
            <p className="text-[20px] font-black text-white leading-tight">
              {MY_RANK}위
              <span className="text-[13px] font-normal text-white/50 ml-2">⭐ {myXP} XP</span>
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-white/40 mb-0.5">TOP 10 진입까지</p>
            <p className="text-[15px] font-black text-[#E24B4A]">+{xpToTop10} XP</p>
          </div>
        </div>

        {/* 리더보드 목록 */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          {MOCK_LEADERBOARD.map((entry, idx) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-3 px-4 py-3 ${
                idx < MOCK_LEADERBOARD.length - 1 ? 'border-b border-[#F0F0EE]' : ''
              } ${entry.rank <= 3 ? 'bg-[#FAFFF6]' : ''}`}
            >
              {/* 순위 */}
              <div className="w-7 text-center flex-shrink-0">
                {entry.medal
                  ? <span className="text-[20px]">{entry.medal}</span>
                  : <span className="text-[12px] font-bold text-[#ADADAD]">{entry.rank}</span>
                }
              </div>

              {/* 아바타 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-black flex-shrink-0 ${
                entry.rank <= 3
                  ? 'bg-[#1A1A1A] text-white'
                  : 'bg-[#F0F0EE] text-[#6B6B6B]'
              }`}>
                {entry.name[0]}
              </div>

              {/* 이름 */}
              <span className={`flex-1 text-[14px] ${entry.rank <= 3 ? 'font-bold text-[#1A1A1A]' : 'font-medium text-[#1A1A1A]'}`}>
                {entry.name}
              </span>

              {/* XP */}
              <span className={`text-[13px] font-bold ${entry.rank <= 3 ? 'text-[#00A651]' : 'text-[#ADADAD]'}`}>
                ⭐ {entry.xp}
              </span>
            </div>
          ))}

          {/* 내 행 */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#FFF5F5] border-t-2 border-[#E24B4A]/20">
            <div className="w-7 text-center flex-shrink-0">
              <span className="text-[12px] font-black text-[#E24B4A]">{MY_RANK}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#E24B4A]/15 flex items-center justify-center text-[12px] font-black text-[#E24B4A] flex-shrink-0">
              나
            </div>
            <span className="flex-1 text-[14px] font-bold text-[#1A1A1A]">나</span>
            <span className="text-[13px] font-bold text-[#E24B4A]">⭐ {myXP}</span>
          </div>
        </div>

        <p className="text-[11px] text-[#ADADAD] text-center pb-2">
          순위는 이번 주 획득 XP 기준입니다
        </p>

      </div>
    </div>
  )
}
