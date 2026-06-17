'use client'

import { ChevronRight, Calendar } from 'lucide-react'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'
import { useDashboard } from './DashboardContext'
import { ADMIN_EMAILS, CERT_ICONS } from './constants'

// ══════════════════════════════════════════════════════════════════
// ③ EXAM TAB
// ══════════════════════════════════════════════════════════════════
export default function ExamTab() {
  const {
    selectedExamCert,
    setSelectedExamCert,
    userCerts,
    session,
    setShowLoginPrompt,
    tab,
    oralLoading,
    oralRegs,
    router,
    setShowOralTimeError,
    setShowOralTicket,
    _accessCodeUsed,
    setShowCodePopup,
    setOralPickerTarget,
    setShowOralDatePicker,
    registeredRounds,
    setExamRound,
    setShowSubjectConfirmModal,
    setShowExamClosedModal,
    setShowExamNotYetModal,
    setShowExamInfoModal,
  } = useDashboard()

  const EXAM_DATES = [
    { round: 1, date: '5월 2일 (토)',  dateValue: '2026-05-02' },
    { round: 2, date: '5월 9일 (토)',  dateValue: '2026-05-09' },
    { round: 3, date: '5월 16일 (토)', dateValue: '2026-05-16' },
    { round: 4, date: '5월 23일 (토)', dateValue: '2026-05-23' },
    { round: 5, date: '5월 30일 (토)', dateValue: '2026-05-30' },
    { round: 6, date: '6월 6일 (토)',  dateValue: '2026-06-06' },
    { round: 7, date: '6월 10일 (수)', dateValue: '2026-06-10' },
    { round: 8, date: '6월 11일 (목)', dateValue: '2026-06-11' },
    { round: 9, date: '6월 12일 (금)', dateValue: '2026-06-12' },
  ]
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 가장 가까운 미래 일정 (지나지 않은 것 중 첫 번째)
  const nextExam = EXAM_DATES.find((e) => new Date(e.dateValue) >= today) ?? null
  // 6월 6일 이후면 응원 메시지 표시 (마지막 모의고사 종료 기준)
  const allExamsDone = new Date('2026-06-06') < today

  const calcDDay = (dateValue: string) => {
    const target = new Date(dateValue)
    target.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return 'D-Day'
    if (diff > 0) return `D-${diff}`
    return '종료'
  }

  // Admin 여부
  const isAdmin = ADMIN_EMAILS.includes(session?.user?.email ?? '')
  if (process.env.NODE_ENV === 'development') {
    console.log('[admin check]', session?.user?.email, isAdmin)
  }

  // 히어로 카드 버튼 상태 계산
  const nowForExam       = new Date()
  const isNextExamToday  = nextExam !== null && new Date(nextExam.dateValue).getTime() === today.getTime()
  const nowH = nowForExam.getHours(), nowM = nowForExam.getMinutes()
  const isEntryClosed    = isNextExamToday && (nowH > 10 || (nowH === 10 && nowM > 0))

  /* ── 1뎁스: 자격증 선택 ── */
  if (selectedExamCert === null) {
    return (
      <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
        <div className="pt-8 pb-2">
          <h2 className="text-[20px] font-black text-[#1A1A1A]">모의고사</h2>
          <p className="text-[13px] text-[#ADADAD] mt-1">자격증을 선택하세요</p>
        </div>
        {userCerts.length > 0 ? (
          <>
            <div className="space-y-3">
              {userCerts.map((uc) => (
                <button
                  key={uc.id}
                  onClick={() => {
                    if (!session) { setShowLoginPrompt(true); return }
                    setSelectedExamCert(uc.cert_id)
                  }}
                  className="w-full bg-white rounded-2xl border border-[#E5E5E5] px-4 py-4 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[20px] flex-shrink-0">
                    {CERT_ICONS[uc.cert_label] ?? '🎯'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-[#1A1A1A] truncate">{uc.cert_label}</p>
                    <p className="text-[11px] text-[#ADADAD]">
                      {uc.cert_id === 'sports-instructor-2-practical' ? '구술모의고사 · 보디빌딩' : '필기 · 8과목 × 20문항'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
                </button>
              ))}
            </div>
            <div className="flex flex-col items-center mt-6 mb-2 px-4">
              <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
              {tab === 'exam' && <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 text-center">
            <p className="text-[14px] text-[#ADADAD]">강의실에서 자격증을 추가하면 모의고사를 이용할 수 있어요</p>
          </div>
        )}
      </div>
    )
  }

  /* ── 2뎁스: 구술 모의고사 ── */
  if (selectedExamCert === 'sports-instructor-2-practical') {
    const todayStr = new Date().toISOString().split('T')[0]

    const getOralWeeks = () => {
      const now = new Date()
      now.setHours(0, 0, 0, 0)
      const examDate = new Date('2026-06-16')

      const dayOfWeek = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

      const weeks: {
        weekNum: number; label: string; range: string
        dates: string[]; isCurrent: boolean; isPast: boolean
      }[] = []

      for (const w of [0, 1, 2, -1]) {
        const weekStart = new Date(monday)
        weekStart.setDate(monday.getDate() + w * 7)
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)

        if (weekStart > examDate) continue

        const dates = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStart)
          d.setDate(weekStart.getDate() + i)
          return d.toISOString().split('T')[0]
        })

        const diffDays = Math.ceil((examDate.getTime() - weekStart.getTime()) / 86400000)
        const weekNum = Math.ceil(diffDays / 7)

        const startM = weekStart.getMonth() + 1
        const startD = weekStart.getDate()
        const endM   = weekEnd.getMonth() + 1
        const endD   = weekEnd.getDate()
        const dateRange = `${startM}/${startD} - ${endM}/${endD}`
        const label =
          w === 0  ? `${dateRange} (이번 주)` :
          w === 1  ? `${dateRange} (다음 주)` :
          w === -1 ? `${dateRange} (지난 주)` :
                     dateRange

        const weekEndStr = weekEnd.toISOString().split('T')[0]
        weeks.push({
          weekNum,
          label,
          range: dateRange,
          dates,
          isCurrent: w === 0,
          isPast: weekEndStr < todayStr,
        })
      }
      return weeks
    }

    const oralWeeks = getOralWeeks()

    return (
      <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
        {/* 헤더 */}
        <div className="pt-8 pb-2 flex items-center gap-3">
          <button
            onClick={() => setSelectedExamCert(null)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F5F5F3] text-[#1A1A1A] text-[18px]"
          >
            ←
          </button>
          <div>
            <p className="text-[11px] text-[#ADADAD] mb-0.5">2급 생활스포츠지도사</p>
            <h2 className="text-[20px] font-black text-[#1A1A1A]">구술 모의고사</h2>
            <p className="text-[13px] text-[#ADADAD] mt-0.5">주당 2회 · 날짜 자유 선택</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={() => router.push('/oral-exam/b28e78c8-8443-4013-bfef-dbe655c72994')}
            className="w-full py-3 mb-3 border-2 border-dashed border-[#00A651] rounded-2xl text-[14px] font-bold text-[#00A651]"
          >
            🔍 관리자 체험하기
          </button>
        )}

        {oralLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-[#00A651] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 모의고사 체험하기 카드 */}
            <div className="mb-4 bg-white border border-[#00A651] rounded-2xl flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13px] font-bold text-[#1A1A1A]">모의고사 체험하기</p>
                <p className="text-[11px] text-[#ADADAD]">랜덤 2문항 · 등록 없이 무료</p>
              </div>
              <button
                onClick={() => router.push('/oral-exam/b28e78c8-8443-4013-bfef-dbe655c72994?preview=true')}
                className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#00A651] text-white"
              >
                시작
              </button>
            </div>

            {oralWeeks.map((week) => (
              <div key={week.weekNum} className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
                {/* 주차 헤더 */}
                <div className={`px-4 py-3 flex items-center justify-between ${week.isCurrent ? 'bg-[#1A1A1A]' : 'bg-[#F5F5F3]'}`}>
                  <span className={`text-[14px] font-black ${week.isCurrent ? 'text-white' : 'text-[#1A1A1A]'}`}>
                    {week.label}
                  </span>
                </div>

                {/* 슬롯 2개 */}
                <div className="divide-y divide-[#F0F0EE]">
                  {([1, 2] as const).map((slot) => {
                    const reg = oralRegs.find(
                      (r) => r.week_number === week.weekNum && r.slot_number === slot
                    )
                    const isToday = reg?.exam_date === todayStr

                    let slotButton: JSX.Element

                    if (week.isPast && reg?.is_completed) {
                      // 1. 지난 주 + 완료
                      slotButton = (
                        <button
                          disabled
                          className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#00A651]/10 text-[#00A651]"
                        >
                          완료 ✓
                        </button>
                      )
                    } else if (week.isPast) {
                      // 2. 지난 주 (reg 유무 무관)
                      slotButton = (
                        <button
                          disabled
                          className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#F5F5F3] text-[#ADADAD]"
                        >
                          기간 종료
                        </button>
                      )
                    } else if (reg && isToday) {
                      // 3. 오늘 시험 당일
                      const [h, m] = reg.start_time.split(':').map(Number)
                      const startMin = h * 60 + m
                      const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
                      const isExamOver = nowMin >= startMin + 10
                      slotButton = isExamOver ? (
                        <button
                          disabled
                          className="px-4 py-2 rounded-xl text-[12px] font-bold text-[#ADADAD] bg-[#F5F5F3]"
                        >
                          시험 종료
                        </button>
                      ) : (
                        <button
                          className="px-4 py-2 rounded-xl text-[12px] font-bold bg-[#00A651] text-white active:opacity-80"
                          onClick={() => {
                            if (isAdmin || (nowMin >= startMin && nowMin < startMin + 10)) {
                              router.push('/oral-exam/b28e78c8-8443-4013-bfef-dbe655c72994')
                            } else {
                              setShowOralTimeError(true)
                            }
                          }}
                        >
                          시작하기
                        </button>
                      )
                    } else if (reg && !isToday) {
                      // 4. 신청 완료 (오늘 아님)
                      slotButton = (
                        <button
                          className="px-4 py-2 rounded-xl text-[12px] font-bold border-2 border-[#00A651] bg-[#00A651]/10 text-[#00A651]"
                          onClick={() => setShowOralTicket(reg)}
                        >
                          신청 완료
                        </button>
                      )
                    } else {
                      // 5. 미신청
                      slotButton = (
                        <button
                          className="px-4 py-2 rounded-xl text-[12px] font-bold border-2 border-[#F5A623] text-[#F5A623] bg-transparent active:opacity-80"
                          onClick={() => {
                            if (!_accessCodeUsed) { setShowCodePopup(true); return }
                            setOralPickerTarget({ weekNum: week.weekNum, slot, weekDates: week.dates })
                            setShowOralDatePicker(true)
                          }}
                        >
                          신청하기
                        </button>
                      )
                    }

                    return (
                      <div key={slot} className="px-4 py-3.5 flex items-center justify-between">
                        <div>
                          <p className="text-[13px] font-bold text-[#1A1A1A]">{slot}회차</p>
                          {reg ? (
                            <p className="text-[11px] text-[#ADADAD] mt-0.5">
                              {reg.exam_date} · #{reg.ticket_number}번
                            </p>
                          ) : (
                            <p className="text-[11px] text-[#ADADAD] mt-0.5">날짜 미정</p>
                          )}
                        </div>
                        {slotButton}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ── 2뎁스: 필기 모의고사 (기존 로직 유지) ── */
  const selectedCertLabel = userCerts.find((c) => c.cert_id === selectedExamCert)?.cert_label ?? ''

  return (
    <div className="overflow-y-auto p-4 pb-24 space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
      <div className="pt-8 pb-2 flex items-center gap-3">
        <button
          onClick={() => setSelectedExamCert(null)}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F5F5F3] text-[#1A1A1A] text-[18px]"
        >
          ←
        </button>
        <div>
          <h2 className="text-[20px] font-black text-[#1A1A1A]">{selectedCertLabel}</h2>
          <p className="text-[13px] text-[#ADADAD] mt-0.5">필기 모의고사</p>
        </div>
      </div>

      <div>
        <p className="text-[12px] text-[#ADADAD]">시험 준비</p>
        <h2 className="text-[18px] font-black text-[#1A1A1A]">2026년 건강운동관리사 모의고사</h2>
      </div>

      {/* 히어로 카드 */}
      {allExamsDone ? (
        /* 모든 모의고사 종료 → 응원 메시지 */
        <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white text-center">
          <div className="text-[36px] mb-2">💪</div>
          <p className="text-[16px] font-black text-white leading-snug">
            곧 시험입니다, 끝까지 힘내세요
          </p>
          <p className="text-[13px] text-white/70 mt-2 leading-relaxed">
            지금까지 준비한 실력을 믿으세요
          </p>
        </div>
      ) : nextExam ? (
        <div className="bg-[#1A1A1A] rounded-2xl p-5 text-white">
          <p className="text-[13px] text-white/50 font-bold tracking-wider mb-2">
            {nextExam.round}회차 모의고사
          </p>
          <div className="text-[43px] font-black text-[#00A651] leading-none">{nextExam.date}</div>
          <div className="text-[43px] font-black text-white leading-none mt-0.5">10:00</div>
          {!registeredRounds.includes(nextExam.round) ? (
            /* 미신청 → 오렌지 아웃라인 */
            <button
              onClick={() => {
                if (!_accessCodeUsed) { setShowCodePopup(true); return }
                setExamRound(nextExam.round); setShowSubjectConfirmModal(true)
              }}
              className="mt-4 w-full py-3 rounded-xl text-[14px] font-bold text-[#F5A623] border-2 border-[#F5A623] bg-transparent"
            >
              신청하기
            </button>
          ) : isEntryClosed ? (
            /* 당일 10:01 이후 → 회색 비활성 */
            <button
              onClick={() => setShowExamClosedModal(true)}
              className="mt-4 w-full py-3 rounded-xl text-[14px] font-bold text-[#ADADAD] bg-[#F5F5F3]"
            >
              입장 마감
            </button>
          ) : isNextExamToday ? (
            /* 당일 → 입장하기 버튼 (시간 체크) */
            <button
              onClick={() => {
                const nowMin  = new Date().getHours() * 60 + new Date().getMinutes()
                const openMin  = 9 * 60 + 50
                const closeMin = 10 * 60 + 1
                if (isAdmin) { router.push('/exam') }
                else if (nowMin < openMin) { setShowExamNotYetModal(true) }
                else if (nowMin <= closeMin) { router.push('/exam') }
                else { setShowExamClosedModal(true) }
              }}
              className="mt-4 w-full py-3 bg-[#00A651] rounded-xl text-[14px] font-bold text-white"
            >
              입장하기
            </button>
          ) : (
            /* 신청 완료 + 당일 아님 → 초록 아웃라인 */
            <div className="mt-4 w-full py-3 rounded-xl text-[14px] font-bold text-center border-2 border-[#00A651] bg-[#00A651]/10 text-[#00A651]">
              신청 완료
            </div>
          )}
          {/* 모의고사 방법 버튼 */}
          <button
            onClick={() => setShowExamInfoModal(true)}
            className="mt-2 w-full py-2 text-[12px] text-white/50 hover:text-white/80"
          >
            모의고사 방법 ▾
          </button>
        </div>
      ) : null}

      {/* 체험하기 카드 */}
      <div className="bg-white rounded-2xl border-2 border-[#00A651] p-4 flex items-center justify-between">
        <div>
          <p className="text-[14px] font-black text-[#1A1A1A]">모의고사 체험하기</p>
          <p className="text-[11px] text-[#6B6B6B] mt-0.5">8과목×5문항 · 40분 · 무료</p>
        </div>
        <button
          onClick={() => router.push('/exam')}
          className="px-4 py-2 bg-[#00A651] rounded-xl text-[13px] font-bold text-white"
        >
          시작
        </button>
      </div>

      {/* 일정 목록 */}
      <div>
        <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">
          <Calendar size={11} className="inline mr-1" />전체 일정
        </p>
        <div className="space-y-2">
          {[...EXAM_DATES].sort((a, b) => {
  const aPast = new Date(a.dateValue) < today
  const bPast = new Date(b.dateValue) < today
  if (aPast && !bPast) return 1
  if (!aPast && bPast) return -1
  return a.round - b.round
}).map((e) => {
            const isNext  = nextExam?.round === e.round
            const isPast  = new Date(e.dateValue) < today
            const isToday = new Date(e.dateValue).getTime() === today.getTime()
            const dday    = calcDDay(e.dateValue)
            return (
              <div key={e.round} className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                isToday ? 'border-[#00A651] bg-white'
                : isPast ? 'border-[#E5E5E5] bg-[#F5F5F3]'
                : 'border-[#E5E5E5] bg-white'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
                    isNext  ? 'bg-[#00A651] text-white'
                    : isPast ? 'bg-[#E5E5E5] text-[#ADADAD]'
                    : 'bg-[#F5F5F3] text-[#ADADAD]'
                  }`}>{e.round}</div>
                  <div>
                    <p className={`text-[13px] font-bold ${
                      isNext ? 'text-[#00A651]' : isPast ? 'text-[#ADADAD]' : 'text-[#1A1A1A]'
                    }`}>{e.date}</p>
                    <p className="text-[10px] text-[#ADADAD]">{e.round}회차</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isPast && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isNext ? 'text-[#00A651] bg-[#00A651]/10' : 'text-[#ADADAD] bg-[#F5F5F3]'
                    }`}>{dday}</span>
                  )}
                  {isPast ? (
                    <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#E5E5E5] text-[#ADADAD]">
                      종료
                    </span>
                  ) : registeredRounds.includes(e.round) ? (
                    <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg border-2 border-[#00A651] bg-[#00A651]/10 text-[#00A651]">
                      신청 완료
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        if (!_accessCodeUsed) { setShowCodePopup(true); return }
                        setExamRound(e.round); setShowSubjectConfirmModal(true)
                      }}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border border-[#00A651] ${
                        isNext ? 'bg-[#00A651] text-white' : 'bg-white text-[#00A651]'
                      }`}
                    >
                      {isNext ? '신청하기' : '사전 신청하기'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {/* 실제 시험일 카드 */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl border-2 border-[#F5A623] bg-[#F5A623]/5">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[14px] bg-[#F5A623]/20">🎯</div>
              <div>
                <p className="text-[13px] font-bold text-[#1A1A1A]">6월 13일 (토)</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-[#F5A623] bg-[#F5A623]/15 px-2.5 py-1 rounded-full">
              실제 시험일 🎯
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
