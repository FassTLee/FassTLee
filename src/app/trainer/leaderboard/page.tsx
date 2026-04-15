'use client'

import { useRouter } from 'next/navigation'
import { PhoneFrame, StatusBar, Header } from '@/components/common'
import { useEducationStore } from '@/store/educationStore'
import { ChevronLeft } from 'lucide-react'

// 목업 리더보드 데이터
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

  return (
    <PhoneFrame>
      <div className="flex flex-col bg-[#F5F5F3]" style={{ minHeight: '812px' }}>
        <StatusBar />
        <Header
          title="주간 리더보드"
          leftAction={
            <button onClick={() => router.back()} className="p-1">
              <ChevronLeft size={20} className="text-[#1A1A1A]" />
            </button>
          }
          rightAction={
            <span className="text-[11px] text-[#ADADAD]">매주 월 초기화</span>
          }
        />

        {/* 내 순위 요약 */}
        <div className="mx-3 mt-3 mb-2 bg-[#1A1A1A] rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-[24px]">🏆</span>
          <div className="flex-1">
            <div className="text-[10px] text-white/50">이번 주 나의 순위</div>
            <div className="text-[18px] font-black text-white">
              {MY_RANK}위
              <span className="text-[12px] font-normal text-white/50 ml-2">
                ⭐ {gamification.weeklyXP} XP
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-white/40">TOP 진입까지</div>
            <div className="text-[13px] font-bold text-[#E24B4A]">
              +{Math.max(0, MOCK_LEADERBOARD[9]?.xp - gamification.weeklyXP + 1)} XP
            </div>
          </div>
        </div>

        {/* 전체 목록 */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-4">
          <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
            {MOCK_LEADERBOARD.map((entry, idx) => (
              <div
                key={entry.rank}
                className={`flex items-center gap-3 px-3 py-2.5 ${
                  idx < MOCK_LEADERBOARD.length - 1 ? 'border-b border-[#F0F0EE]' : ''
                } ${entry.rank <= 3 ? 'bg-[#FFFDF5]' : ''}`}
              >
                {/* 순위 */}
                <div className="w-7 text-center flex-shrink-0">
                  {entry.medal
                    ? <span className="text-[18px]">{entry.medal}</span>
                    : <span className="text-[12px] font-bold text-[#ADADAD]">{entry.rank}</span>
                  }
                </div>
                {/* 아바타 */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                  entry.rank <= 3 ? 'bg-[#1A1A1A] text-white' : 'bg-[#F0F0EE] text-[#1A1A1A]'
                }`}>
                  {entry.name[0]}
                </div>
                {/* 이름 */}
                <span className="flex-1 text-[13px] font-medium text-[#1A1A1A]">{entry.name}</span>
                {/* XP */}
                <span className={`text-[12px] font-bold ${entry.rank <= 3 ? 'text-[#639922]' : 'text-[#ADADAD]'}`}>
                  ⭐ {entry.xp}
                </span>
              </div>
            ))}

            {/* 내 행 (구분선으로 분리) */}
            <div className="flex items-center gap-3 px-3 py-2.5 bg-[#FFF5F5] border-t-2 border-[#E24B4A]/20">
              <div className="w-7 text-center flex-shrink-0">
                <span className="text-[12px] font-bold text-[#E24B4A]">{MY_RANK}</span>
              </div>
              <div className="w-7 h-7 rounded-full bg-[#E24B4A]/15 flex items-center justify-center text-[11px] font-bold text-[#E24B4A] flex-shrink-0">
                나
              </div>
              <span className="flex-1 text-[13px] font-bold text-[#1A1A1A]">나 (나)</span>
              <span className="text-[12px] font-bold text-[#E24B4A]">⭐ {gamification.weeklyXP}</span>
            </div>
          </div>

          <p className="text-[10px] text-[#ADADAD] text-center mt-3">
            순위는 이번 주 획득 XP 기준입니다
          </p>
        </div>

        {/* 하단 네비 */}
        <div className="bg-white border-t border-[#E5E5E5] flex items-center justify-around px-2 py-2.5">
          {[
            { icon: '←', label: '뒤로', action: () => router.back() },
            { icon: '🏠', label: '홈',  action: () => router.push('/trainer/education') },
            { icon: '👤', label: '내 정보', action: () => router.push('/trainer/profile') },
          ].map((tab) => (
            <button key={tab.label} onClick={tab.action} className="flex flex-col items-center gap-0.5 px-4">
              <span className="text-[18px]">{tab.icon}</span>
              <span className="text-[10px] font-medium text-[#ADADAD]">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </PhoneFrame>
  )
}
