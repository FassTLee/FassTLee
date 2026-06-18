'use client'

import Image from 'next/image'
import { ChevronRight, Plus } from 'lucide-react'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'
import { ALL_VIDEOS, HOME_VIDEO_COUNT } from '@/lib/videos'
import { useDashboard } from './DashboardContext'
import { SUBJECT_META, CERT_ICONS, type ChapterStat } from './constants'

// ══════════════════════════════════════════════════════════════════
// ① HOME TAB
// ══════════════════════════════════════════════════════════════════
export default function HomeTab() {
  const {
    session, router, tab,
    profileExamDate, profileCert, profileName, profileAvatar, avatarError,
    certLabel, streak, studiedToday,
    recentStats, allStats, subjectCards, subjectProgress, chapterSubjectMap,
    subjects, userCerts,
    todayChapter, todayChapterState,
    playingIdx, videoRefs,
    calYear, calMonth, calTouchStartX,
    setAvatarError, setShowDDayModal, setShowLoginPrompt,
    handleVideoTap, moveCalMonth,
  } = useDashboard()

    // D-Day 계산 (profileExamDate 기준)
    const examDiff = profileExamDate
      ? Math.ceil((new Date(profileExamDate).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000)
      : null

    // ── 학습 활동 내역 계산 ──────────────────────────────────────────

    // 캘린더: 날짜별 점수 맵
    const actToday = new Date(); actToday.setHours(0, 0, 0, 0)
    const studyMap: Record<string, number[]> = {}
    const hundredMap: { [key: string]: boolean } = {}
    allStats.forEach((s) => {
      if (!s.last_attempt_at) return
      const d = new Date(s.last_attempt_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      if (!studyMap[key]) studyMap[key] = []
      studyMap[key].push(s.avg_score)

      if (s.best_score === 100) {
        const d2 = new Date(s.last_attempt_at)
        const hKey = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`
        hundredMap[hKey] = true
      }
    })
    // 그리드: 선택 월 1일~말일, 월요일 시작 패딩 포함
    const firstDay = new Date(calYear, calMonth - 1, 1)
    const lastDay  = new Date(calYear, calMonth, 0)
    const startPad = (firstDay.getDay() + 6) % 7  // Mon=0
    const totalCells = Math.ceil((startPad + lastDay.getDate()) / 7) * 7
    const calCells = Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - startPad + 1
      if (dayNum < 1 || dayNum > lastDay.getDate()) return { empty: true, isFuture: false, isToday: false, studied: false, avgScore: 0 }
      const d = new Date(calYear, calMonth - 1, dayNum)
      const isFuture = d > actToday
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const scores = studyMap[key] ?? []
      return {
        empty: false,
        isFuture,
        isToday: d.getTime() === actToday.getTime(),
        studied: scores.length > 0,
        avgScore: scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
        hasHundred: hundredMap[key] ?? false,
      }
    })
    const getCellColor = (cell: typeof calCells[0]) => {
      if (cell.isFuture) return '#FAFAFA'
      if (!cell.studied)  return '#E5E5E5'
      if (cell.avgScore >= 80) return '#00A651'
      if (cell.avgScore >= 60) return '#7DBA5A'
      return '#C4E49A'
    }

    // 주간 요약 (이번 주 7일 vs 지난 주 7일)
    const day7ago  = new Date(actToday); day7ago.setDate(actToday.getDate() - 7)
    const day14ago = new Date(actToday); day14ago.setDate(actToday.getDate() - 14)
    const inRange  = (s: ChapterStat, from: Date, to: Date) => {
      if (!s.last_attempt_at) return false
      const d = new Date(s.last_attempt_at); d.setHours(0, 0, 0, 0)
      return d >= from && d <= to
    }
    const thisWeekStats = allStats.filter((s) => inRange(s, day7ago, actToday))
    const lastWeekStats = allStats.filter((s) => inRange(s, day14ago, new Date(day7ago.getTime() - 1)))
    const thisWeekCount = thisWeekStats.length
    const lastWeekCount = lastWeekStats.length
    const thisWeekAvg   = thisWeekStats.length > 0
      ? Math.round(thisWeekStats.reduce((a, s) => a + s.avg_score, 0) / thisWeekStats.length) : 0
    const lastWeekAvg   = lastWeekStats.length > 0
      ? Math.round(lastWeekStats.reduce((a, s) => a + s.avg_score, 0) / lastWeekStats.length) : 0

    // 취약 과목 (avg_score < 60)
    const subjectScoreMap: Record<string, number[]> = {}
    allStats.forEach((s) => {
      const subj = chapterSubjectMap[s.chapter_id]
      if (!subj) return
      if (!subjectScoreMap[subj]) subjectScoreMap[subj] = []
      subjectScoreMap[subj].push(s.avg_score)
    })
    const weakSubjects = Object.entries(subjectScoreMap)
      .map(([name, scores]) => ({
        name,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .filter((s) => s.avg < 60)
      .sort((a, b) => a.avg - b.avg)
      .slice(0, 3)

    // 강의실 바로가기: 자격증 진도율 집계
    const displayCert = certLabel || profileCert || ''
    const aggProgress = Object.values(subjectProgress).reduce(
      (acc, p) => ({ total: acc.total + p.total, completed: acc.completed + p.completed }),
      { total: 0, completed: 0 }
    )
    const overallPct = aggProgress.total > 0
      ? Math.round((aggProgress.completed / aggProgress.total) * 100)
      : 0

    return (
    <div className="overflow-y-auto pb-[130px]" style={{ height: 'calc(100dvh - 56px)' }}>

      {/* ── 유저 정보 영역 ──────────────────────────────────────── */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-[#F0F0EE]">
        {/* 아바타 + 이름 */}
        <div className="flex items-center gap-3 mb-4">
          {profileAvatar && !avatarError ? (
            <Image
              src={profileAvatar}
              alt="avatar"
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover flex-shrink-0"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-[#00A651]/15 flex items-center justify-center text-[18px] flex-shrink-0">
              👤
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[16px] font-black text-[#1A1A1A] truncate">
              {profileName ?? session?.user?.name ?? '사용자'}
            </p>
            {profileCert && (
              <p className="text-[11px] text-[#ADADAD] mt-0.5 truncate">{profileCert}</p>
            )}
          </div>
        </div>

        {/* D-Day + 스트릭 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* D-Day 카드 */}
          {examDiff !== null ? (
            <button
              onClick={() => setShowDDayModal(true)}
              className="bg-[#1A1A1A] rounded-2xl px-4 py-3 text-left"
            >
              <p className="text-[10px] text-white/50 font-bold mb-0.5">시험까지</p>
              <p className="text-[30px] font-black text-[#00A651] leading-none">
                {examDiff > 0 ? `D-${examDiff}` : examDiff === 0 ? 'D-Day' : `D+${Math.abs(examDiff)}`}
              </p>
              <p className="text-[13px] font-bold text-[#F5A623] mt-1 truncate">
                {profileCert
                  ? `${new Date(profileExamDate!).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })} · ${profileCert}`
                  : new Date(profileExamDate!).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
                }
              </p>
            </button>
          ) : (
            <button
              onClick={() => setShowDDayModal(true)}
              className="bg-[#F5F5F3] border border-dashed border-[#DADADA] rounded-2xl px-4 py-3 text-left"
            >
              <p className="text-[10px] text-[#ADADAD] font-bold mb-0.5">시험까지</p>
              <p className="text-[13px] font-bold text-[#ADADAD]">시험일 설정하기</p>
              <p className="text-[10px] text-[#ADADAD]/60 mt-0.5">탭하여 추가</p>
            </button>
          )}

          {/* 스트릭 카드 */}
          <div className="bg-[#F5F5F3] rounded-2xl px-4 py-3">
            <p className="text-[10px] text-[#ADADAD] font-bold mb-0.5">연속 학습일</p>
            <p className="text-[22px] font-black text-[#1A1A1A] leading-none">
              {streak > 0 ? `🔥 ${streak}일` : '0일'}
            </p>
            <p className="text-[10px] text-[#ADADAD] mt-0.5">
              {streak > 0 ? '오늘도 이어가세요!' : '오늘 학습을 시작하세요'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center mt-6 mb-2 px-4">
        <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
        {tab === 'home' && <KakaoAdFit unit="DAN-tyVXseZl4nT47hHT" width={320} height={50} />}
      </div>

      {/* ② Daily 학습/테스트 */}
      <div className="px-4 py-2">
        {studiedToday ? (
          /* 학습 완료 → 테스트 버튼 */
          <button
            onClick={() => router.push('/trainer/dashboard?tab=exam')}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">✅</span>
            <div className="text-left flex-1">
              <p className="text-[15px] font-bold">테스트 시작하기</p>
              <p className="text-[11px] text-white/50">오늘 학습 내용을 점검해보세요</p>
            </div>
            <ChevronRight size={18} className="text-white/50" />
          </button>
        ) : todayChapter ? (
          /* ── 오늘의 학습 카드 (3단계 상태 분기) ── */
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: '#00A651' + '1A' }}
              >
                {SUBJECT_META[todayChapter.subjectName]?.icon ?? '📚'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{todayChapter.title}</p>
                <p className="text-[11px] text-[#ADADAD] truncate">{todayChapter.subjectName}</p>
              </div>
            </div>

            {todayChapterState === 'lesson' && (
              <button
                onClick={() => router.push(`/lesson/${todayChapter.chapterId}`)}
                className="mt-3 flex items-center gap-1 text-[11px] font-bold bg-[#E8F5E9] text-[#2e7d32] px-3 py-1.5 rounded-full"
              >
                ▶ 학습 이어서 하기
              </button>
            )}
            {todayChapterState === 'test_start' && (
              <button
                onClick={() => router.push(`/test/${todayChapter.chapterId}`)}
                className="mt-3 flex items-center gap-1 text-[11px] font-bold bg-[#E3F2FD] text-[#1565c0] px-3 py-1.5 rounded-full"
              >
                ✏️ 챕터 테스트 시작하기
              </button>
            )}
            {todayChapterState === 'test_retry' && (
              <button
                onClick={() => router.push(`/test/${todayChapter.chapterId}`)}
                className="mt-3 flex items-center gap-1 text-[11px] font-bold bg-[#FFF8E1] text-[#e65100] px-3 py-1.5 rounded-full"
              >
                🔄 챕터 테스트 재도전
              </button>
            )}
          </div>
        ) : recentStats.length > 0 ? (
          /* 학습 이력 있음 + 오늘 미학습 → 학습 시작하기 */
          <button
            onClick={() => {
              const first = subjectCards.find((c) => c.subjectId)
              if (first?.subjectId) {
                router.push(`/chapters/${first.subjectId}`)
              } else {
                router.push('/trainer/dashboard?tab=classroom')
              }
            }}
            className="w-full bg-[#1A1A1A] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">📖</span>
            <div className="text-left flex-1">
              {userCerts[0]?.cert_label && (
                <p className="text-[10px] text-white/40 mb-0.5">{userCerts[0].cert_label}</p>
              )}
              <p className="text-[15px] font-bold">학습 시작하기</p>
              <p className="text-[11px] text-white/50">오늘의 학습을 이어가세요</p>
            </div>
            <ChevronRight size={18} className="text-white/50" />
          </button>
        ) : (
          /* 신규 사용자 */
          <button
            onClick={() => router.push('/trainer/dashboard?tab=classroom')}
            className="w-full bg-[#00A651] text-white rounded-2xl p-4 flex items-center gap-3 active:opacity-90"
          >
            <span className="text-[24px]">📚</span>
            <div className="text-left flex-1">
              {userCerts[0]?.cert_label && (
                <p className="text-[10px] text-white/60 mb-0.5">{userCerts[0].cert_label}</p>
              )}
              <p className="text-[15px] font-bold">학습 시작하기</p>
              <p className="text-[11px] text-white/70">강의실에서 과목을 선택해보세요</p>
            </div>
            <ChevronRight size={18} className="text-white/70" />
          </button>
        )}
      </div>

      {/* ③ 추천 영상 — 중앙 85% + 좌우 peek 캐러셀 */}
      {false && <div className="py-2">
        <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider px-4 mb-2">
          오늘의 추천 영상
        </p>
        {/*
          scroll-snap-align: start + scrollPaddingLeft: 7.5%
          → 첫 카드는 marginLeft 7.5%로 출발, 이후 카드도 좌측 7.5% 기준으로 스냅
          → 양쪽 peek ≈ 7.5% - 5px(gap/2)
        */}
        <div
          className="flex overflow-x-scroll"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: '7.5%',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            overscrollBehaviorX: 'contain',
          } as React.CSSProperties}
        >
          {ALL_VIDEOS.slice(0, HOME_VIDEO_COUNT).map((vid, i) => {
            const isFirst = i === 0
            const isLast  = i === HOME_VIDEO_COUNT - 1
            return (
              <div
                key={i}
                className="flex-shrink-0 cursor-pointer"
                style={{
                  width: '85%',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  marginLeft:  isFirst ? '7.5%' : '10px',
                  marginRight: isLast  ? '7.5%' : 0,
                }}
                onClick={() => handleVideoTap(i)}
              >
                {/* 영상 영역 */}
                <div
                  className="rounded-2xl overflow-hidden bg-[#1A1A1A] relative"
                  style={{ aspectRatio: '9 / 11' }}
                >
                  <video
                    ref={(el) => { videoRefs.current[i] = el }}
                    src={vid.src}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                    preload="metadata"
                    loop
                    onLoadedMetadata={(e) => {
                      const v = e.target as HTMLVideoElement
                      v.currentTime = 0.001
                    }}
                  />

                  {/* 정지 오버레이 — 재생 버튼 */}
                  {playingIdx !== i && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-black/20 via-transparent to-black/40 pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-[#00A651] flex items-center justify-center shadow-xl">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                          <polygon points="7,3 21,12 7,21" />
                        </svg>
                      </div>
                    </div>
                  )}

                  {/* 재생 중 — 녹색 테두리 + 인디케이터 */}
                  {playingIdx === i && (
                    <>
                      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#00A651] px-2.5 py-1 rounded-full pointer-events-none">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-white text-[10px] font-bold">재생 중</span>
                      </div>
                      <div className="absolute inset-0 rounded-2xl ring-2 ring-[#00A651] pointer-events-none" />
                    </>
                  )}
                </div>

                {/* 카드 하단 — 제목/설명 */}
                <div className="px-1 pt-2.5 pb-1">
                  <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{vid.title}</p>
                  <p className="text-[11px] text-[#ADADAD] truncate mt-0.5">{vid.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* 더보기 버튼 */}
        <button
          onClick={() => router.push('/videos')}
          className="w-full mt-3 flex items-center justify-center gap-1.5 py-2.5 text-[13px] font-bold text-[#00A651]"
        >
          더보기 <ChevronRight size={14} />
        </button>
      </div>}

      {/* ④ 강의실 바로가기 — 자격증 카드 */}
      <div className="py-2">
        <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider px-4 mb-2">
          강의실 바로가기
        </p>
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          style={{
            scrollSnapType: 'x mandatory',
            scrollPaddingLeft: '1rem',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          } as React.CSSProperties}
        >
          {userCerts.length > 0 ? (
            <>
              {/* user_certifications 기반 다중 카드 */}
              {[...userCerts]
                .sort((a, b) => {
                  if (a.last_studied_at && b.last_studied_at)
                    return new Date(b.last_studied_at).getTime() - new Date(a.last_studied_at).getTime()
                  if (a.last_studied_at) return -1
                  if (b.last_studied_at) return 1
                  return a.order_index - b.order_index
                })
                .slice(0, 3)
                .map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => {
                      const firstSubjName = uc.subjects?.[0]
                      const card = firstSubjName
                        ? subjectCards.find((c) => c.name === firstSubjName)
                        : null
                      if (card?.subjectId) {
                        router.push(`/chapters/${card.subjectId}`)
                      } else {
                        router.push('/trainer/dashboard?tab=classroom')
                      }
                    }}
                    className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl p-4 text-left active:opacity-90"
                    style={{ width: '72%', scrollSnapAlign: 'start', marginLeft: '1rem' }}
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[20px] flex-shrink-0">
                        {CERT_ICONS[uc.cert_label] ?? '🏅'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-black text-white truncate">{uc.cert_label}</p>
                        <p className="text-[11px] text-white/50">
                          {uc.subjects.length > 0 ? `${uc.subjects.length}개 과목` : '과목을 선택해주세요'}
                        </p>
                      </div>
                    </div>
                    {/* 과목 태그 */}
                    {uc.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {uc.subjects.slice(0, 4).map((s) => (
                          <span key={s} className="text-[10px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full truncate max-w-[80px]">
                            {s}
                          </span>
                        ))}
                        {uc.subjects.length > 4 && (
                          <span className="text-[10px] bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
                            +{uc.subjects.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                ))
              }
              {/* 강의 추가하기 카드 (최대 3개 미만일 때만) */}
              {userCerts.length < 3 && (
                <button
                  onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
                  className="flex-shrink-0 rounded-2xl border-2 border-dashed border-[#E5E5E5] bg-white flex flex-col items-center justify-center gap-2 active:bg-[#F5F5F3]"
                  style={{ width: '44%', scrollSnapAlign: 'start', minHeight: '130px', marginRight: '1rem' }}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F3] flex items-center justify-center">
                    <Plus size={20} className="text-[#ADADAD]" />
                  </div>
                  <p className="text-[12px] font-bold text-[#ADADAD]">강의 추가하기</p>
                </button>
              )}
            </>
          ) : (
            <>
              {/* 기존 단일 자격증 카드 (fallback) */}
              {displayCert ? (
                <button
                  onClick={() => router.push('/trainer/dashboard?tab=classroom')}
                  className="flex-shrink-0 bg-[#1A1A1A] rounded-2xl p-4 text-left active:opacity-90"
                  style={{ width: '75%', scrollSnapAlign: 'start', marginLeft: '1rem' }}
                >
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[20px] flex-shrink-0">
                      {CERT_ICONS[displayCert] ?? '🏅'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-black text-white truncate">{displayCert}</p>
                      <p className="text-[11px] text-white/50">
                        {subjects.length > 0 ? `${subjects.length}개 과목 수강 중` : '과목을 선택해주세요'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-[11px] text-white/40">전체 진도율</span>
                      <span className="text-[18px] font-black text-[#00A651] leading-none">{overallPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-[#00A651] rounded-full transition-all" style={{ width: `${overallPct}%` }} />
                    </div>
                    {aggProgress.total > 0 && (
                      <p className="text-[10px] text-white/30 mt-1.5">
                        {aggProgress.completed} / {aggProgress.total} 챕터 완료
                      </p>
                    )}
                  </div>
                </button>
              ) : null}
              {/* 자격증 추가하기 카드 */}
              <button
                onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
                className="flex-shrink-0 rounded-2xl border-2 border-dashed border-[#E5E5E5] bg-white flex flex-col items-center justify-center gap-2 active:bg-[#F5F5F3]"
                style={{
                  width: displayCert ? '44%' : '75%',
                  scrollSnapAlign: 'start',
                  minHeight: '130px',
                  marginLeft: displayCert ? 0 : '1rem',
                  marginRight: '1rem',
                }}
              >
                <div className="w-10 h-10 rounded-xl bg-[#F5F5F3] flex items-center justify-center">
                  <Plus size={20} className="text-[#ADADAD]" />
                </div>
                <p className="text-[12px] font-bold text-[#ADADAD]">자격증 추가하기</p>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ⑤ 내 학습 활동 내역 */}
      <div className="px-4 py-2 space-y-3 pb-4">
        <p className="text-[12px] font-bold text-[#ADADAD] uppercase tracking-wider">내 학습 활동 내역</p>

        {/* 1. 학습 캘린더 (잔디밭) */}
        <div
          className="bg-white rounded-2xl border border-[#E5E5E5] p-4"
          onTouchStart={(e) => { calTouchStartX.current = e.touches[0].clientX }}
          onTouchEnd={(e) => {
            if (calTouchStartX.current === null) return
            const dx = e.changedTouches[0].clientX - calTouchStartX.current
            calTouchStartX.current = null
            if (dx > 50)  moveCalMonth(-1)  // 오른쪽 스와이프 → 이전 달
            else if (dx < -50) moveCalMonth(1)  // 왼쪽 스와이프 → 다음 달
          }}
        >
          {/* 월 이동 헤더 */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => moveCalMonth(-1)}
                className="w-6 h-6 flex items-center justify-center text-[#ADADAD] hover:text-[#1A1A1A] text-[14px] font-bold"
              >◀</button>
              <p className="text-[15px] font-black text-[#1A1A1A]">
                {calYear}년 {calMonth}월
              </p>
              <button
                onClick={() => moveCalMonth(1)}
                className="w-6 h-6 flex items-center justify-center text-[#ADADAD] hover:text-[#1A1A1A] text-[14px] font-bold"
              >▶</button>
            </div>
            <p className="text-[11px] text-[#ADADAD]">
              {streak > 0 ? `🔥 ${streak}일 연속` : '오늘 학습해보세요'}
            </p>
          </div>
          <p className="text-[11px] text-[#ADADAD] mb-3">🌱 학습 캘린더</p>
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 gap-[3px] mb-1">
            {['월', '화', '수', '목', '금', '토', '일'].map((d) => (
              <div key={d} className="text-center text-[9px] font-bold text-[#ADADAD]">{d}</div>
            ))}
          </div>
          {/* 잔디밭 그리드 */}
          <div className="grid grid-cols-7 gap-[3px]">
            {calCells.map((cell, i) => (
              <div
                key={i}
                className={`aspect-square rounded-[3px] ${cell.empty ? '' : cell.isToday ? 'ring-[1.5px] ring-[#1A1A1A] ring-offset-0' : cell.hasHundred ? 'ring-[1.5px] ring-[#FFD54F] ring-offset-0' : ''}`}
                style={{ backgroundColor: cell.empty ? 'transparent' : getCellColor(cell) }}
              />
            ))}
          </div>
          {/* 범례 */}
          <div className="flex items-center gap-3 mt-2.5 justify-end">
            {([
              { color: '#E5E5E5', label: '없음' },
              { color: '#C4E49A', label: '~59점' },
              { color: '#7DBA5A', label: '60~79' },
              { color: '#00A651', label: '80점↑' },
            ] as const).map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[9px] text-[#ADADAD]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. 주간 요약 */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* 이번 주 */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-3.5">
            <p className="text-[10px] font-bold text-[#ADADAD] mb-2">이번 주</p>
            <p className="text-[24px] font-black text-[#1A1A1A] leading-none">{thisWeekCount}
              <span className="text-[12px] font-semibold text-[#ADADAD] ml-1">챕터</span>
            </p>
            {thisWeekAvg > 0 && (
              <p className="text-[12px] font-bold text-[#00A651] mt-1.5">평균 {thisWeekAvg}점</p>
            )}
            {allStats.length > 0 && lastWeekCount > 0 && (
              <p className={`text-[10px] mt-1 font-semibold ${
                thisWeekCount >= lastWeekCount ? 'text-[#00A651]' : 'text-[#E24B4A]'
              }`}>
                {thisWeekCount >= lastWeekCount ? '↑' : '↓'} {Math.abs(thisWeekCount - lastWeekCount)}챕터
              </p>
            )}
          </div>
          {/* 지난 주 */}
          <div className="bg-[#F5F5F3] rounded-2xl border border-[#E5E5E5] p-3.5">
            <p className="text-[10px] font-bold text-[#ADADAD] mb-2">지난 주</p>
            <p className="text-[24px] font-black text-[#1A1A1A] leading-none">{lastWeekCount}
              <span className="text-[12px] font-semibold text-[#ADADAD] ml-1">챕터</span>
            </p>
            {lastWeekAvg > 0 && (
              <p className="text-[12px] font-semibold text-[#ADADAD] mt-1.5">평균 {lastWeekAvg}점</p>
            )}
          </div>
        </div>

        {/* 3. 취약 과목 알림 */}
        {allStats.length === 0 ? (
          <div className="text-[12px] text-[#ADADAD] text-center py-4">
            아직 학습 기록이 없어요.<br/>
            학습을 시작하면 활동 내역이 표시됩니다.
          </div>
        ) : weakSubjects.length === 0 ? (
          <div className="text-[12px] text-[#ADADAD] text-center py-4">
            아직 테스트 데이터가 없어요.<br/>
            챕터 테스트를 완료하면 취약 과목이 표시됩니다.
          </div>
        ) : (
          <div className="bg-[#FFF8F0] rounded-2xl border border-[#F5A623]/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[15px]">⚠️</span>
              <p className="text-[13px] font-bold text-[#1A1A1A]">집중 학습이 필요한 과목</p>
            </div>
            <div className="space-y-2.5">
              {weakSubjects.map(({ name, avg }) => (
                <div key={name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[14px] flex-shrink-0">{SUBJECT_META[name]?.icon ?? '📚'}</span>
                    <span className="text-[13px] font-semibold text-[#1A1A1A] truncate">{name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="w-16 h-1.5 bg-[#F0E8DC] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F5A623] rounded-full"
                        style={{ width: `${avg}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-black text-[#F5A623] w-8 text-right">{avg}점</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-[#ADADAD] mt-3 leading-relaxed">
              정답률 60% 미만 — 해당 과목 챕터를 다시 학습해보세요
            </p>
          </div>
        )}
      </div>
    </div>
    )
  }
