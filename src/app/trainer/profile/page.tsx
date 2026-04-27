'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PhoneFrame, StatusBar, Header } from '@/components/common'
import { useEducationStore } from '@/store/educationStore'
import { COURSES, getLevelName, getXPForNextLevel } from '@/types/education'
import { ChevronLeft, ChevronRight, Settings, RefreshCw } from 'lucide-react'

const STYLE_KEY = 'kinepia_learning_style'
const SUBJECTS_KEY = 'kinepia_selected_subjects'

interface StyleInfo {
  learning_style: string | null
  style_tested_at: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const { progress, gamification } = useEducationStore()
  const [styleInfo, setStyleInfo] = useState<StyleInfo>({ learning_style: null, style_tested_at: null })
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])

  useEffect(() => {
    // 학습 성향
    const cached = localStorage.getItem(STYLE_KEY)
    if (cached) setStyleInfo({ learning_style: cached, style_tested_at: null })
    fetch('/api/v1/learning-style')
      .then((r) => r.json())
      .then((d) => { if (d.learning_style) setStyleInfo(d) })
      .catch(() => {})

    // 수강 과목
    const subjectsCached = localStorage.getItem(SUBJECTS_KEY)
    if (subjectsCached) {
      try { setSelectedSubjects(JSON.parse(subjectsCached)) } catch { /* ignore */ }
    }
    fetch('/api/v1/selected-subjects')
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d.selected_subjects) && d.selected_subjects.length > 0) setSelectedSubjects(d.selected_subjects) })
      .catch(() => {})
  }, [])

  const prevLevelXP = getXPForNextLevel(gamification.level - 1)
  const nextLevelXP = getXPForNextLevel(gamification.level)
  const current = gamification.xp - prevLevelXP
  const needed  = nextLevelXP - prevLevelXP
  const pct = needed > 0 ? Math.min(100, Math.round((current / needed) * 100)) : 100

  const totalMvp       = COURSES.filter((c) => c.phase === 'mvp').length
  const completedCount = progress.completedCourses.length
  const levelName      = getLevelName(gamification.level)

  const STATS = [
    { label: '완료한 강의', value: `${completedCount}개`, sub: `/ ${totalMvp}개` },
    { label: '완료한 레슨', value: `${progress.completedLessons.length}개`, sub: '' },
    { label: '통과한 테스트', value: `${progress.passedTests.length}개`, sub: '' },
    { label: '이번 주 XP',  value: `${gamification.weeklyXP}`, sub: 'XP' },
    { label: '누적 XP',     value: `${gamification.xp}`, sub: 'XP' },
    { label: '연속 학습',   value: `${gamification.streakDays}일`, sub: '' },
  ]

  return (
    <PhoneFrame>
      <div className="flex flex-col bg-[#F5F5F3]" style={{ minHeight: '812px' }}>
        <StatusBar />
        <Header
          title="내 정보"
          leftAction={
            <button onClick={() => router.back()} className="p-1">
              <ChevronLeft size={20} className="text-[#1A1A1A]" />
            </button>
          }
          rightAction={
            <button onClick={() => router.push('/settings/privacy')} className="p-1">
              <Settings size={18} className="text-[#6B6B6B]" />
            </button>
          }
        />

        <div className="flex-1 overflow-y-auto scrollbar-hide pb-4">

          {/* 레벨 & XP 카드 */}
          <div className="mx-3 mt-3 bg-[#1A1A1A] rounded-xl p-4 text-white">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] text-white/40 mb-0.5">현재 레벨</div>
                <div className="text-[26px] font-black leading-none">Lv.{gamification.level}</div>
                <div className="text-[12px] text-white/60 mt-0.5">{levelName}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-white/40 mb-0.5">스트릭</div>
                <div className="text-[20px]">🔥</div>
                <div className="text-[13px] font-bold">{gamification.streakDays}일</div>
              </div>
            </div>
            {/* XP 진행 바 */}
            <div className="mb-1">
              <div className="flex justify-between text-[10px] text-white/40 mb-1">
                <span>{gamification.xp - prevLevelXP} XP</span>
                <span>→ Lv.{gamification.level + 1} ({needed} XP)</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#E24B4A] rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-[10px] text-white/30 mt-1 text-right">{pct}%</div>
            </div>
          </div>

          {/* 학습 성향 */}
          <div className="mx-3 mt-2.5">
            <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 성향</p>
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3">
              <div className="text-[24px]">
                {styleInfo.learning_style === 'memorizer' ? '🧠' : styleInfo.learning_style === 'conceptualizer' ? '💡' : '❓'}
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-bold text-[#1A1A1A]">
                  {styleInfo.learning_style === 'memorizer'
                    ? '암기형'
                    : styleInfo.learning_style === 'conceptualizer'
                    ? '이해형'
                    : '미측정'}
                </div>
                {styleInfo.style_tested_at && (
                  <div className="text-[10px] text-[#ADADAD] mt-0.5">
                    {new Date(styleInfo.style_tested_at).toLocaleDateString('ko-KR')} 측정
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem(STYLE_KEY)
                  router.push('/onboarding/style-test')
                }}
                className="flex items-center gap-1 text-[11px] text-[#E24B4A] font-semibold"
              >
                <RefreshCw size={12} /> 재테스트
              </button>
            </div>
          </div>

          {/* 수강 과목 */}
          <div className="mx-3 mt-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider">수강 과목</p>
              <button
                onClick={() => router.push('/select-subject')}
                className="text-[11px] text-[#E24B4A] font-semibold"
              >
                과목 수정
              </button>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5E5] p-3">
              {selectedSubjects.length === 0 ? (
                <button
                  onClick={() => router.push('/select-subject')}
                  className="w-full text-[13px] text-[#ADADAD] py-1"
                >
                  과목을 선택해주세요 →
                </button>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {selectedSubjects.map((name) => (
                    <span key={name} className="px-2.5 py-1 rounded-full bg-[#E24B4A]/10 text-[#E24B4A] text-[11px] font-semibold">
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 배지 */}
          {gamification.badges.length > 0 && (
            <div className="mx-3 mt-2.5">
              <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">획득한 배지</p>
              <div className="flex flex-wrap gap-2">
                {gamification.badges.map((badge, i) => (
                  <div key={i} className="bg-white border border-[#E5E5E5] rounded-xl px-3 py-2 text-center">
                    <div className="text-[20px]">🎖️</div>
                    <div className="text-[10px] font-medium text-[#1A1A1A] mt-0.5">{badge}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 학습 통계 */}
          <div className="mx-3 mt-2.5">
            <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 통계</p>
            <div className="grid grid-cols-3 gap-2">
              {STATS.map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-[#E5E5E5] p-2.5 text-center">
                  <div className="text-[16px] font-black text-[#1A1A1A]">
                    {s.value}<span className="text-[11px] font-normal text-[#ADADAD]">{s.sub}</span>
                  </div>
                  <div className="text-[9px] text-[#ADADAD] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 개인정보 / 설정 링크 */}
          <div className="mx-3 mt-2.5">
            <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
              {[
                { label: '리더보드',       path: '/trainer/leaderboard',  icon: '🏆' },
                { label: '개인정보 설정',  path: '/settings/privacy',     icon: '🔒' },
                { label: '개인정보처리방침', path: '/privacy',             icon: '📄' },
                { label: '이용약관',       path: '/terms',                icon: '📋' },
              ].map((item, idx, arr) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-[#F5F5F3] ${
                    idx < arr.length - 1 ? 'border-b border-[#F0F0EE]' : ''
                  }`}
                >
                  <span className="text-[16px] w-6 text-center">{item.icon}</span>
                  <span className="flex-1 text-[13px] text-[#1A1A1A]">{item.label}</span>
                  <ChevronRight size={14} className="text-[#ADADAD]" />
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 하단 네비 */}
        <div className="bg-white border-t border-[#E5E5E5] flex items-center justify-around px-2 py-2.5">
          {[
            { icon: '📚', label: '강의', action: () => router.push('/trainer/education/ab-01') },
            { icon: '🏠', label: '홈',  action: () => router.push('/trainer/education') },
            { icon: '👤', label: '내 정보', active: true, action: () => {} },
          ].map((tab) => (
            <button key={tab.label} onClick={tab.action} className="flex flex-col items-center gap-0.5 px-4">
              <span className="text-[18px]">{tab.icon}</span>
              <span className={`text-[10px] font-medium ${'active' in tab && tab.active ? 'text-[#E24B4A]' : 'text-[#ADADAD]'}`}>
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </PhoneFrame>
  )
}
