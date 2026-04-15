'use client'

import { useRouter } from 'next/navigation'
import { PhoneFrame, StatusBar, Header } from '@/components/common'
import { useEducationStore } from '@/store/educationStore'
import { COURSES, CATEGORY_META, getXPForNextLevel, type CourseCategory } from '@/types/education'
import { ChevronRight } from 'lucide-react'
import { AdBanner } from '@/components/common/AdBanner'

// ─── XP 블록 진행 바 ──────────────────────────────────────────
function XPBlockBar({ xp, level }: { xp: number; level: number }) {
  const nextLevelXP = getXPForNextLevel(level)
  const prevLevelXP = getXPForNextLevel(level - 1)
  const current = xp - prevLevelXP
  const needed = nextLevelXP - prevLevelXP
  const pct = needed > 0 ? Math.min(1, current / needed) : 1
  const filled = Math.round(pct * 10)
  const empty = 10 - filled
  return (
    <span className="font-mono text-[11px] text-white/70">
      {'█'.repeat(filled)}{'░'.repeat(empty)}
    </span>
  )
}

const CATEGORY_ORDER: CourseCategory[] = [
  'anatomy_basic',
  'anatomy_functional',
  'conditioning_massage',
  'conditioning_stretch',
]

type FeedCard =
  | { type: 'shorts'; id: string; title: string; duration: string; thumb: string; category: string }
  | { type: 'course'; id: string; courseId: string; subjectName: string; chapterName: string; color: string }
  | { type: 'ad'; position: string }

const FEED_CARDS: FeedCard[] = [
  { type: 'shorts', id: 'sh-01', title: '장요근 스트레칭 3가지', duration: '2:40', thumb: '🎬', category: '기능 해부학' },
  { type: 'course', id: 'fc-01', courseId: 'ab-01', subjectName: '기초 해부학', chapterName: '신체 구조 기본 개념', color: '#378ADD' },
  { type: 'ad', position: 'dashboard_feed' },
  { type: 'shorts', id: 'sh-02', title: '대둔근 활성화 루틴', duration: '3:15', thumb: '🎬', category: '컨디셔닝' },
  { type: 'course', id: 'fc-02', courseId: 'af-01', subjectName: '기능 해부학', chapterName: '기시(O) & 정지(I) — 초급', color: '#639922' },
]

// 첫 번째 강의 ID (네비게이션용)
const FIRST_COURSE_ID = COURSES
  .filter((c) => c.phase === 'mvp')
  .sort((a, b) => a.orderIndex - b.orderIndex)[0]?.id ?? 'ab-01'

export default function EducationPage() {
  const router = useRouter()
  const { progress, gamification } = useEducationStore()

  const isCompleted = (courseId: string) => progress.completedCourses.includes(courseId)
  const isUnlocked  = (courseId: string) => progress.unlockedCourses.includes(courseId)

  const prevLevelXP = getXPForNextLevel(gamification.level - 1)
  const nextLevelXP = getXPForNextLevel(gamification.level)

  // 다음 학습 항목 자동 선택
  const nextCourse = COURSES
    .filter((c) => c.phase === 'mvp' && isUnlocked(c.id) && !isCompleted(c.id))
    .sort((a, b) => a.orderIndex - b.orderIndex)[0] ?? COURSES[0]
  const nextCourseMeta = CATEGORY_META[nextCourse.category as CourseCategory]

  // 진행 중 과목
  const activeCourses = CATEGORY_ORDER.map((cat) => {
    const catCourses = COURSES.filter((c) => c.category === cat && c.phase === 'mvp')
    const completedInCat = catCourses.filter((c) => isCompleted(c.id)).length
    const anyUnlocked = catCourses.some((c) => isUnlocked(c.id))
    if (!anyUnlocked) return null
    return {
      cat,
      meta: CATEGORY_META[cat],
      total: catCourses.length,
      completed: completedInCat,
      pct: Math.round((completedInCat / catCourses.length) * 100),
    }
  }).filter(Boolean) as { cat: CourseCategory; meta: typeof CATEGORY_META[CourseCategory]; total: number; completed: number; pct: number }[]

  const MY_RANK = 14
  const MY_XP = gamification.weeklyXP

  return (
    <PhoneFrame>
      <div className="flex flex-col bg-[#F5F5F3]" style={{ minHeight: '812px' }}>
        <StatusBar />
        <Header
          title="FassT Education"
          leftAction={<span />}
          rightAction={
            <button
              onClick={() => router.push('/trainer/education/s5')}
              className="text-[12px] font-medium text-[#378ADD]"
            >
              Test
            </button>
          }
        />

        {/* ─── 스크롤 영역 ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-16">

          {/* ── 섹션 1: 내 상태 (1줄) ───────────────────────────── */}
          <button
            onClick={() => router.push('/trainer/profile')}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-[#1A1A1A] text-white active:opacity-80"
          >
            <span className="text-[12px]">🔥{gamification.streakDays}일</span>
            <span className="text-white/30">·</span>
            <span className="text-[12px] font-bold">Lv.{gamification.level}</span>
            <span className="text-white/30">·</span>
            <XPBlockBar xp={gamification.xp} level={gamification.level} />
            <span className="text-[10px] text-white/50 ml-0.5">
              {gamification.xp - prevLevelXP}/{nextLevelXP - prevLevelXP}XP
            </span>
            <span className="ml-auto text-[11px] text-white/60 flex items-center gap-0.5">
              🏆{MY_RANK}위 <ChevronRight size={11} />
            </span>
          </button>

          {/* ── 섹션 2: 오늘의 데일리 + 피드 ──────────────────────── */}
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">오늘의 데일리</p>
          </div>

          {/* 데일리 카드 */}
          <div className="px-3 mb-2.5">
            <button
              onClick={() => router.push(`/trainer/education/${nextCourse.id}`)}
              className="w-full flex items-center gap-3 px-3 py-3 bg-[#1A1A1A] rounded-xl shadow-md active:opacity-80 text-left"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[18px] flex-shrink-0"
                style={{ backgroundColor: (nextCourseMeta?.color ?? '#378ADD') + '25' }}
              >
                {nextCourseMeta?.icon ?? '📚'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-white/50 mb-0.5 truncate">
                  {nextCourseMeta?.label ?? '강의'} — {nextCourse.title}
                </div>
                <div className="text-[13px] font-bold text-white">오늘의 데일리 · 예상 5분</div>
                <div className="text-[10px] text-white/40">+5 XP</div>
              </div>
              <div className="flex items-center gap-0.5 bg-[#E24B4A] rounded-lg px-2.5 py-1.5 flex-shrink-0">
                <span className="text-[11px] font-bold text-white">시작</span>
                <ChevronRight size={12} className="text-white" />
              </div>
            </button>
          </div>

          {/* 가로 스크롤 피드 */}
          <div className="mb-3">
            <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider px-3 mb-1.5">추천 피드</p>
            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide px-3 pb-0.5">
              {FEED_CARDS.map((card, idx) => {
                if (card.type === 'ad') {
                  return (
                    <div key={`ad-${idx}`} className="flex-shrink-0 w-40">
                      <AdBanner position={card.position} planName="free" />
                    </div>
                  )
                }
                if (card.type === 'shorts') {
                  return (
                    <div key={card.id} className="flex-shrink-0 w-32 bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
                      <div className="h-16 bg-[#1A1A1A] flex items-center justify-center">
                        <span className="text-[24px]">{card.thumb}</span>
                      </div>
                      <div className="p-2">
                        <div className="text-[9px] text-[#E24B4A] font-bold mb-0.5">🎬 쇼츠</div>
                        <div className="text-[11px] font-bold text-[#1A1A1A] leading-tight">{card.title}</div>
                        <div className="text-[9px] text-[#ADADAD] mt-0.5">{card.duration}</div>
                      </div>
                    </div>
                  )
                }
                if (card.type === 'course') {
                  return (
                    <button
                      key={card.id}
                      onClick={() => router.push(`/trainer/education/${card.courseId}`)}
                      className="flex-shrink-0 w-36 bg-white rounded-xl border border-[#E5E5E5] p-2.5 text-left active:bg-[#F5F5F3]"
                    >
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white inline-block mb-1"
                        style={{ backgroundColor: card.color }}
                      >
                        📚 강의
                      </span>
                      <div className="text-[9px] text-[#ADADAD] mb-0.5">{card.subjectName}</div>
                      <div className="text-[11px] font-bold text-[#1A1A1A] leading-tight">{card.chapterName}</div>
                    </button>
                  )
                }
                return null
              })}
            </div>
          </div>

          {/* ── 섹션 3: 진행 중인 과목 ─────────────────────────────── */}
          {activeCourses.length > 0 ? (
            <div className="px-3 mb-3">
              <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">진행 중인 과목</p>
              <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
                {activeCourses.map((item, idx) => (
                  <button
                    key={item.cat}
                    onClick={() => router.push(`/trainer/education?cat=${item.cat}`)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left active:bg-[#F5F5F3] ${
                      idx < activeCourses.length - 1 ? 'border-b border-[#F0F0EE]' : ''
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] flex-shrink-0"
                      style={{ backgroundColor: item.meta.color + '20' }}
                    >
                      {item.meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[12px] font-bold text-[#1A1A1A] truncate">{item.meta.label}</span>
                        <span className="text-[10px] text-[#6B6B6B] flex-shrink-0 ml-1">{item.pct}%</span>
                      </div>
                      <div className="w-full h-1 bg-[#F0F0EE] rounded-full">
                        <div className="h-full rounded-full" style={{ width: `${item.pct}%`, backgroundColor: item.meta.color }} />
                      </div>
                    </div>
                    <ChevronRight size={13} className="text-[#ADADAD] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-3 mb-3">
              <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">과목</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_ORDER.map((cat) => {
                  const meta = CATEGORY_META[cat]
                  const catCourses = COURSES.filter((c) => c.category === cat && c.phase === 'mvp')
                  const locked = catCourses.every((c) => !isUnlocked(c.id))
                  return (
                    <button
                      key={cat}
                      onClick={() => !locked && router.push(`/trainer/education/${catCourses[0]?.id ?? ''}`)}
                      className={`p-3 rounded-xl border text-left ${
                        locked ? 'bg-[#F5F5F3] border-dashed border-[#CCCCCC] opacity-50' : 'bg-white border-[#E5E5E5] shadow-sm active:bg-[#F5F5F3]'
                      }`}
                    >
                      <div className="text-[20px] mb-1">{meta.icon}</div>
                      <div className="text-[11px] font-bold text-[#1A1A1A]">{meta.label}</div>
                      <div className="text-[10px] text-[#ADADAD] mt-0.5">{locked ? '🔒 잠금' : `${catCourses.length}강의`}</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── 섹션 4: 이번 주 나의 순위 (압축) ─────────────────── */}
          <div className="px-3 mb-3">
            <div className="bg-white rounded-xl border border-[#E5E5E5] flex items-center px-3 py-3 gap-3">
              <span className="text-[20px]">🏆</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-[#ADADAD]">이번 주 나의 순위</div>
                <div className="text-[14px] font-black text-[#1A1A1A]">
                  {MY_RANK}위
                  <span className="text-[11px] font-normal text-[#ADADAD] ml-1.5">⭐ {MY_XP} XP</span>
                </div>
              </div>
              <button
                onClick={() => router.push('/trainer/leaderboard')}
                className="flex items-center gap-0.5 text-[11px] font-medium text-[#378ADD] flex-shrink-0"
              >
                전체 순위 <ChevronRight size={12} />
              </button>
            </div>
          </div>

        </div>

        {/* ─── 하단 네비게이션 ──────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] flex items-center justify-around px-2 py-2.5">
          {[
            { icon: '📚', label: '강의', path: `/trainer/education/${FIRST_COURSE_ID}`, active: false },
            { icon: '🏠', label: '홈',   path: '/trainer/education',                     active: true  },
            { icon: '👤', label: '내 정보', path: '/trainer/profile',                    active: false },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-0.5 px-4"
            >
              <span className="text-[18px]">{tab.icon}</span>
              <span className={`text-[10px] font-medium ${tab.active ? 'text-[#E24B4A]' : 'text-[#ADADAD]'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </PhoneFrame>
  )
}
