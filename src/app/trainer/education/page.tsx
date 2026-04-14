'use client'

import { useRouter } from 'next/navigation'
import { PhoneFrame, StatusBar, Header } from '@/components/common'
import { useEducationStore } from '@/store/educationStore'
import { COURSES, CATEGORY_META, getXPForNextLevel, type CourseCategory } from '@/types/education'
import { ChevronRight } from 'lucide-react'
import { AdBanner } from '@/components/common/AdBanner'

// ─── XP 블록 진행 바 (텍스트 기반) ────────────────────────────
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

// ─── 상수 ──────────────────────────────────────────────────────
const CATEGORY_ORDER: CourseCategory[] = [
  'anatomy_basic',
  'anatomy_functional',
  'conditioning_massage',
  'conditioning_stretch',
]

// 피드 카드 유형
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

export default function EducationPage() {
  const router = useRouter()
  const { progress, gamification } = useEducationStore()

  const isCompleted = (courseId: string) => progress.completedCourses.includes(courseId)
  const isUnlocked = (courseId: string) => progress.unlockedCourses.includes(courseId)

  const totalMvp = COURSES.filter((c) => c.phase === 'mvp').length
  const completedCount = progress.completedCourses.length
  const nextLevelXP = getXPForNextLevel(gamification.level)
  const prevLevelXP = getXPForNextLevel(gamification.level - 1)

  // 다음 학습 항목 자동 선택 (가장 첫 번째 미완료 unlock 과목)
  const nextCourse = COURSES
    .filter((c) => c.phase === 'mvp' && isUnlocked(c.id) && !isCompleted(c.id))
    .sort((a, b) => a.orderIndex - b.orderIndex)[0] ?? COURSES[0]
  const nextCourseMeta = CATEGORY_META[nextCourse.category as CourseCategory]

  // 진행 중 과목 (완료 포함, 시작한 것만)
  const activeCourses = CATEGORY_ORDER.map((cat) => {
    const catCourses = COURSES.filter((c) => c.category === cat && c.phase === 'mvp')
    const completedInCat = catCourses.filter((c) => isCompleted(c.id)).length
    const anyUnlocked = catCourses.some((c) => isUnlocked(c.id))
    const anyStarted = completedInCat > 0 || catCourses.some((c) => isUnlocked(c.id) && !isCompleted(c.id))
    if (!anyUnlocked && !anyStarted) return null
    return {
      cat,
      meta: CATEGORY_META[cat],
      total: catCourses.length,
      completed: completedInCat,
      pct: Math.round((completedInCat / catCourses.length) * 100),
    }
  }).filter(Boolean) as NonNullable<{ cat: CourseCategory; meta: typeof CATEGORY_META[CourseCategory]; total: number; completed: number; pct: number }>[]

  // 리더보드 목업 (상위 3)
  const TOP3 = [
    { rank: 1, name: '김지훈', xp: 850, medal: '🥇' },
    { rank: 2, name: '이수진', xp: 720, medal: '🥈' },
    { rank: 3, name: '박민서', xp: 610, medal: '🥉' },
  ]
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

        {/* ─── 단일 스크롤 ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">

          {/* ══════════════════════════════════════════════════════
              섹션 1 — 내 상태 (1줄)
          ══════════════════════════════════════════════════════ */}
          <button
            onClick={() => router.push('/trainer/profile')}
            className="w-full flex items-center gap-2 px-4 py-3 bg-[#1A1A1A] text-white active:opacity-80"
          >
            <span className="text-[13px]">🔥{gamification.streakDays}일</span>
            <span className="mx-1 text-white/30">·</span>
            <span className="text-[13px] font-bold">Lv.{gamification.level}</span>
            <span className="mx-1 text-white/30">·</span>
            <XPBlockBar xp={gamification.xp} level={gamification.level} />
            <span className="text-[11px] text-white/50 ml-0.5">
              {gamification.xp - prevLevelXP}/{nextLevelXP - prevLevelXP}XP
            </span>
            <span className="ml-auto text-[12px] text-white/60 flex items-center gap-1">
              🏆{MY_RANK}위 <ChevronRight size={12} />
            </span>
          </button>

          {/* ══════════════════════════════════════════════════════
              섹션 2 — 오늘의 데일리 강의 + 피드
          ══════════════════════════════════════════════════════ */}
          <div className="pt-4 px-4">
            <div className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">
              오늘의 데일리
            </div>
          </div>

          {/* 데일리 카드 */}
          <div className="px-4 mb-3">
            <button
              onClick={() => router.push(`/trainer/education/${nextCourse.id}`)}
              className="w-full flex items-center gap-3 p-4 bg-[#1A1A1A] rounded-2xl shadow-md active:opacity-80 text-left"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-[20px] flex-shrink-0"
                style={{ backgroundColor: (nextCourseMeta?.color ?? '#378ADD') + '25' }}
              >
                {nextCourseMeta?.icon ?? '📚'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-white/50 mb-0.5">
                  {nextCourseMeta?.label ?? '강의'} — {nextCourse.title}
                </div>
                <div className="text-[14px] font-bold text-white truncate">
                  오늘의 데일리 · 예상 5분
                </div>
                <div className="text-[10px] text-white/40 mt-0.5">
                  {progress.completedLessons.length}개 완료 · +5 XP
                </div>
              </div>
              <div className="flex items-center gap-1 bg-[#E24B4A] rounded-lg px-3 py-1.5 flex-shrink-0">
                <span className="text-[12px] font-bold text-white">시작</span>
                <ChevronRight size={13} className="text-white" />
              </div>
            </button>
          </div>

          {/* 가로 스크롤 피드 */}
          <div className="mb-4">
            <div className="flex items-center justify-between px-4 mb-2">
              <span className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">추천 피드</span>
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1">
              {FEED_CARDS.map((card, idx) => {
                if (card.type === 'ad') {
                  return (
                    <div key={`ad-${idx}`} className="flex-shrink-0 w-44">
                      <AdBanner position={card.position} planName="free" />
                    </div>
                  )
                }
                if (card.type === 'shorts') {
                  return (
                    <div
                      key={card.id}
                      className="flex-shrink-0 w-36 bg-white rounded-xl border border-[#E5E5E5] overflow-hidden"
                    >
                      <div className="h-20 bg-[#1A1A1A] flex items-center justify-center">
                        <span className="text-[28px]">{card.thumb}</span>
                      </div>
                      <div className="p-2.5">
                        <div className="text-[9px] text-[#E24B4A] font-bold mb-1">🎬 쇼츠</div>
                        <div className="text-[11px] font-bold text-[#1A1A1A] leading-tight mb-1">{card.title}</div>
                        <div className="text-[10px] text-[#ADADAD]">{card.duration} · {card.category}</div>
                      </div>
                    </div>
                  )
                }
                if (card.type === 'course') {
                  return (
                    <button
                      key={card.id}
                      onClick={() => router.push(`/trainer/education/${card.courseId}`)}
                      className="flex-shrink-0 w-40 bg-white rounded-xl border border-[#E5E5E5] p-3 text-left active:bg-[#F5F5F3]"
                    >
                      <div className="text-[9px] font-bold mb-1.5 px-1.5 py-0.5 rounded-full inline-block text-white"
                        style={{ backgroundColor: card.color }}
                      >
                        📚 강의
                      </div>
                      <div className="text-[10px] text-[#ADADAD] mb-0.5">{card.subjectName}</div>
                      <div className="text-[12px] font-bold text-[#1A1A1A] leading-tight">{card.chapterName}</div>
                    </button>
                  )
                }
                return null
              })}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════
              섹션 3 — 진행 중인 과목
          ══════════════════════════════════════════════════════ */}
          {activeCourses.length > 0 && (
            <div className="px-4 mb-4">
              <div className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">진행 중인 과목</div>
              <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
                {activeCourses.map((item, idx) => (
                  <button
                    key={item.cat}
                    onClick={() => router.push(`/trainer/education?cat=${item.cat}`)}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-[#F5F5F3] ${
                      idx < activeCourses.length - 1 ? 'border-b border-[#F0F0EE]' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-[16px] flex-shrink-0"
                      style={{ backgroundColor: item.meta.color + '20' }}
                    >
                      {item.meta.icon}
                    </div>
                    {/* Info + Bar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-bold text-[#1A1A1A] truncate">{item.meta.label}</span>
                        <span className="text-[11px] font-medium text-[#6B6B6B] flex-shrink-0 ml-2">
                          {item.pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F0F0EE] rounded-full">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${item.pct}%`,
                            backgroundColor: item.meta.color,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-[#ADADAD] mt-0.5">
                        {item.completed}/{item.total} 완료
                        {item.completed === item.total && ' ✅'}
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-[#ADADAD] flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 과목이 없을 때 — 전체 과목 바로가기 */}
          {activeCourses.length === 0 && (
            <div className="px-4 mb-4">
              <div className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">과목</div>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_ORDER.map((cat) => {
                  const meta = CATEGORY_META[cat]
                  const catCourses = COURSES.filter((c) => c.category === cat && c.phase === 'mvp')
                  const locked = catCourses.every((c) => !isUnlocked(c.id))
                  return (
                    <button
                      key={cat}
                      onClick={() => router.push(`/trainer/education/${catCourses[0]?.id ?? ''}`)}
                      disabled={locked}
                      className={`p-4 rounded-xl border text-left ${
                        locked
                          ? 'bg-[#F5F5F3] border-dashed border-[#CCCCCC] opacity-50'
                          : 'bg-white border-[#E5E5E5] shadow-sm active:bg-[#F5F5F3]'
                      }`}
                    >
                      <div className="text-[22px] mb-1.5">{meta.icon}</div>
                      <div className="text-[12px] font-bold text-[#1A1A1A]">{meta.label}</div>
                      <div className="text-[10px] text-[#ADADAD] mt-0.5">
                        {locked ? '🔒 잠금' : `${catCourses.length}강의`}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════
              섹션 4 — 이번 주 리더보드
          ══════════════════════════════════════════════════════ */}
          <div className="px-4 mb-2">
            <div className="flex items-center justify-between mb-2">
              <div className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">이번 주 리더보드</div>
              <button
                onClick={() => router.push('/trainer/leaderboard')}
                className="text-[11px] text-[#378ADD] flex items-center gap-0.5"
              >
                전체보기 <ChevronRight size={11} />
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              {TOP3.map((entry, idx) => (
                <div
                  key={entry.rank}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx < TOP3.length - 1 ? 'border-b border-[#F0F0EE]' : ''
                  }`}
                >
                  <span className="text-[18px] w-6 text-center flex-shrink-0">{entry.medal}</span>
                  <div className="w-7 h-7 bg-[#F0F0EE] rounded-full flex items-center justify-center text-[12px] font-bold text-[#1A1A1A] flex-shrink-0">
                    {entry.name[0]}
                  </div>
                  <span className="flex-1 text-[13px] font-medium text-[#1A1A1A]">{entry.name}</span>
                  <span className="text-[12px] font-bold text-[#639922]">⭐ {entry.xp} XP</span>
                </div>
              ))}

              {/* 내 순위 */}
              <div className="flex items-center gap-3 px-4 py-3 bg-[#F5F5F3] border-t border-[#E5E5E5]">
                <span className="text-[13px] font-bold text-[#ADADAD] w-6 text-center flex-shrink-0">
                  {MY_RANK}
                </span>
                <div className="w-7 h-7 bg-[#E24B4A]/20 rounded-full flex items-center justify-center text-[12px] font-bold text-[#E24B4A] flex-shrink-0">
                  나
                </div>
                <span className="flex-1 text-[13px] font-bold text-[#1A1A1A]">나</span>
                <span className="text-[12px] font-bold text-[#E24B4A]">⭐ {MY_XP} XP</span>
              </div>

              {/* 전체 보기 */}
              <button
                onClick={() => router.push('/trainer/leaderboard')}
                className="w-full py-3 text-[12px] text-[#378ADD] font-medium border-t border-[#F0F0EE] active:bg-[#F5F5F3]"
              >
                전체 순위 보기 →
              </button>
            </div>
          </div>

          {/* 총 진행 현황 mini card */}
          <div className="px-4 mt-3 mb-4">
            <div className="bg-[#1A1A1A] rounded-2xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="text-[11px] text-white/50 mb-1">전체 진도</div>
                <div className="w-full h-2 bg-white/10 rounded-full">
                  <div
                    className="h-full bg-[#E24B4A] rounded-full transition-all"
                    style={{ width: `${Math.round((completedCount / totalMvp) * 100)}%` }}
                  />
                </div>
                <div className="text-[10px] text-white/40 mt-1">{completedCount}/{totalMvp} 강의 완료</div>
              </div>
              <button
                onClick={() => router.push('/trainer/profile')}
                className="text-[11px] text-white/60 flex items-center gap-0.5 flex-shrink-0"
              >
                내 기록 <ChevronRight size={11} />
              </button>
            </div>
          </div>

        </div>

        {/* ─── Bottom Nav ──────────────────────────────────────── */}
        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-[#E5E5E5] flex items-center justify-around px-2 py-3">
          {[
            { icon: '📚', label: 'Education', active: true, path: '/trainer/education' },
            { icon: '🏠', label: '대시보드', active: false, path: '/trainer/dashboard' },
            { icon: '🌐', label: '랜딩', active: false, path: '/landing' },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center gap-0.5"
            >
              <span className="text-[20px]">{tab.icon}</span>
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
