'use client'

import { ChevronRight, Plus, MapPin, Clock, Bell } from 'lucide-react'
import { signOut } from 'next-auth/react'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'
import { LearningTypeIcon } from '@/components/common/LearningTypeIcon'
import { isLearningType, LEARNING_TYPES } from '@/lib/learning-types'
import { useDashboard } from './DashboardContext'
import {
  REQUIRED_SUBJECTS,
  CERT_LABELS,
  SUBJECT_META,
  CERT_EXAM_DATES,
  fmtCodeDate,
} from './constants'

// ══════════════════════════════════════════════════════════════════
// ④ PROFILE TAB
// ══════════════════════════════════════════════════════════════════
export default function ProfileTab() {
  const {
    styleType,
    certLabel, profileCert, certKey,
    healthCertSubjects,
    dbRequiredNames,
    subjects,
    certTypeInput, setCertTypeInput,
    dbGoalSubjects,
    examDateInput, setExamDateInput,
    subjectCards,
    subjectProgress, subjectProgressByCert, certSlugToId,
    router,
    _accessCodeUsed, _codeExpiresAt,
    setShowCodePopup,
    certOpen, setCertOpen,
    certOrder, setCertOrder,
    userCerts,
    subjectOrderByCert, setSubjectOrderByCert,
    moveCert, moveSubject, handleOrderSave,
    regionInput, setRegionInput,
    handleSaveProfile, savingProfile,
    methodOpen, setMethodOpen,
    studyTimeInput, setStudyTimeInput,
    studyCountInput, setStudyCountInput,
    studyTimeSlotInput, setStudyTimeSlotInput,
    tab,
    activityOpen, setActivityOpen,
    recentActivity,
    setTab,
    showLogoutModal, setShowLogoutModal,
  } = useDashboard()

    const currentStyle   = styleType
    const styleMeta      = isLearningType(currentStyle) ? LEARNING_TYPES[currentStyle] : null

    // 자격증/과목 섹션용 (DB 우선, 하드코딩 폴백)
    const displayCertName   = certLabel || profileCert || ''
    const fallbackRequiredP = certKey === 'exercise-prescriptionist'
      ? healthCertSubjects.map((s) => s.name)
      : (REQUIRED_SUBJECTS[certKey] ?? [])
    const effectiveReqP     = dbRequiredNames.length > 0 ? dbRequiredNames : fallbackRequiredP
    const requiredInP       = subjects.filter((s) => effectiveReqP.includes(s))
    const optionalInP       = subjects.filter((s) => !effectiveReqP.includes(s))
    const showSubjectLabels = effectiveReqP.length > 0

    // 학습 목표 섹션용 (DB 우선, 하드코딩 폴백)
    const selectedCertKeyGoal = Object.entries(CERT_LABELS).find(([, v]) => v === certTypeInput)?.[0] ?? ''
    const goalRequiredFromDB  = dbGoalSubjects.filter((s) => s.is_required).map((s) => s.name)
    const goalOptionalFromDB  = dbGoalSubjects.filter((s) => !s.is_required).map((s) => s.name)
    const fallbackGoalSubs    = selectedCertKeyGoal === 'exercise-prescriptionist'
      ? healthCertSubjects.map((s) => s.name)
      : (selectedCertKeyGoal ? (REQUIRED_SUBJECTS[selectedCertKeyGoal] ?? []) : [])
    const goalRequiredSubs    = goalRequiredFromDB.length > 0 ? goalRequiredFromDB : fallbackGoalSubs
    const goalOptionalSubs    = goalOptionalFromDB
    const _hasGoalSubjects    = goalRequiredSubs.length > 0 || goalOptionalSubs.length > 0
    const selectedYear         = examDateInput ? new Date(examDateInput).getFullYear() : null

    // 공통 과목 행 컴포넌트 (inline)
    const SubjectRowP = ({ name, hasBorder }: { name: string; hasBorder: boolean }) => {
      const card     = subjectCards.find((c) => c.name === name)
      const meta     = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
      const certId   = certSlugToId[certKey]
      // certId가 있고 해당 자격증 기준 분리 진도율이 있으면 그걸 우선 사용 (예: IIPA Lv1/Lv2) —
      // 없으면 과목 전체 합산인 subjectProgress로 폴백
      const progress = (certId && subjectProgressByCert[`${certId}::${name}`]) ?? subjectProgress[name]
      const pct      = progress && progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
      return (
        <button
          onClick={() => { if (card?.subjectId) router.push(`/chapters/${card.subjectId}${certId ? `?certId=${certId}` : ''}`) }}
          disabled={!card?.subjectId}
          className={`w-full px-4 py-3 flex items-center gap-3 text-left active:bg-[#F5F5F3] disabled:opacity-60 ${hasBorder ? 'border-b border-[#F0F0EE]' : ''}`}
        >
          <div className="w-8 h-8 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-[16px] flex-shrink-0">{meta.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {progress !== undefined ? (
                <>
                  <div className="flex-1 h-1 bg-[#F0F0EE] rounded-full overflow-hidden">
                    <div className="h-full bg-[#00A651] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] text-[#ADADAD] flex-shrink-0 font-semibold">{pct}%</span>
                </>
              ) : (
                <span className="text-[10px] text-[#ADADAD]">학습 시작 전</span>
              )}
            </div>
          </div>
          {card?.subjectId
            ? <ChevronRight size={13} className="text-[#ADADAD] flex-shrink-0" />
            : <span className="text-[10px] text-[#ADADAD] flex-shrink-0">준비중</span>
          }
        </button>
      )
    }

    return (
      <div className="overflow-y-auto p-4 pb-[130px] space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>
        <div className="pt-8">
          <h2 className="text-[20px] font-black text-[#1A1A1A]">내 정보</h2>
        </div>

        {/* ── 1. 학습 성향 ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 성향</p>
          {styleMeta ? (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-4 flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${styleMeta.color}18` }}
              >
                <LearningTypeIcon type={styleMeta.key} size={28} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-black text-[#1A1A1A]">{styleMeta.label}</p>
                <p className="text-[11px] text-[#ADADAD] mt-0.5 leading-snug">{styleMeta.desc}</p>
              </div>
              <button
                onClick={() => {
                  localStorage.removeItem('kinepia_learning_type')
                  router.push('/onboarding/style-test')
                }}
                className="flex-shrink-0 text-[11px] text-[#6B6B6B] border border-[#E5E5E5] rounded-lg px-2.5 py-1.5 font-semibold"
              >
                다시 확인하기
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.push('/onboarding/style-test')}
              className="w-full bg-white rounded-2xl border-2 border-dashed border-[#E5E5E5] px-4 py-4 flex items-center gap-3 active:bg-[#F5F5F3]"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#F5F5F3] flex items-center justify-center text-[24px] flex-shrink-0">🧩</div>
              <div className="flex-1 text-left">
                <p className="text-[14px] font-bold text-[#1A1A1A]">학습 유형 분석하기</p>
                <p className="text-[11px] text-[#ADADAD] mt-0.5">나에게 맞는 학습 방법을 찾아보세요</p>
              </div>
              <ChevronRight size={16} className="text-[#ADADAD] flex-shrink-0" />
            </button>
          )}
        </div>

        {/* ── 2. 이용 코드 ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">이용 코드</p>
          <div className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-4">
            <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">이용권 코드</p>
            {/* ── 2026-06-15 수정: 만료 여부 분기 처리 (P0-9) ── */}
            {_accessCodeUsed ? (
              _codeExpiresAt && new Date(_codeExpiresAt) < new Date() ? (
                // 만료된 경우
                <div>
                  <p className="text-[12px] text-[#E24B4A] font-bold mb-0.5">⚠ 이용권 만료 ({_accessCodeUsed})</p>
                  <p className="text-[11px] text-[#ADADAD] mb-3">
                    {new Date(_codeExpiresAt).toLocaleDateString('ko-KR')} 에 만료됨
                  </p>
                  <button
                    onClick={() => setShowCodePopup(true)}
                    className="text-[12px] font-bold text-[#00A651] border border-[#00A651]/30 bg-[#00A651]/5 px-3 py-2 rounded-xl"
                  >
                    새 코드 입력하러 가기
                  </button>
                </div>
              ) : (
                // 이용 중인 경우
                <div>
                  <p className="text-[12px] text-[#00A651] font-bold mb-0.5">✓ 코드 등록 완료</p>
                  <p className="text-[12px] font-bold text-[#1A1A1A] mb-3">
                    {_accessCodeUsed}{_codeExpiresAt && ` · ${fmtCodeDate(_codeExpiresAt)}까지`}
                  </p>
                  <button
                    onClick={() => setShowCodePopup(true)}
                    className="text-[12px] font-bold text-[#00A651] border border-[#00A651]/30 bg-[#00A651]/5 px-3 py-2 rounded-xl"
                  >
                    새 코드 입력
                  </button>
                </div>
              )
            ) : (
              // 미등록인 경우
              <>
                <p className="text-[11px] text-[#ADADAD] mb-3">코드를 입력하면 모든 과목을 무료로 이용할 수 있어요.</p>
                <button
                  onClick={() => setShowCodePopup(true)}
                  className="text-[12px] font-bold text-[#00A651] border border-[#00A651]/30 bg-[#00A651]/5 px-3 py-2 rounded-xl"
                >
                  코드 입력하러 가기
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 3. 수강 자격증 & 학습 목표 (collapsible) ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">수강 자격증 &amp; 학습 목표</p>
          <div
            className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-3 cursor-pointer"
            onClick={() => {
              if (!certOpen && certOrder.length === 0) {
                const sortedCerts = [...userCerts].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                setCertOrder(sortedCerts.map((c) => c.cert_id))
                const savedOrder = JSON.parse(localStorage.getItem('kinepia_subject_order') ?? '{}')
                const initialSubjectOrder: Record<string, string[]> = {}
                sortedCerts.forEach((cert) => {
                  initialSubjectOrder[cert.cert_id] = savedOrder[cert.cert_id] ?? cert.subjects ?? []
                })
                setSubjectOrderByCert(initialSubjectOrder)
              }
              setCertOpen(!certOpen)
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[15px]">🎯</span>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">자격증 · 과목 · 학습 목표</p>
                  <p className="text-[11px] text-[#ADADAD]">
                    {displayCertName || '자격증을 선택하세요'}
                    {subjects.length > 0 ? ` · ${subjects.length}개 과목` : ''}
                  </p>
                </div>
              </div>
              <span className={`text-[#ADADAD] text-[18px] transition-transform inline-block ${certOpen ? 'rotate-90' : ''}`}>›</span>
            </div>

            {certOpen && (
              <div className="mt-3 pt-3 border-t border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>

                {/* A. 자격증 학습 우선순위 */}
                {certOrder.length > 1 && (
                  <div className="mb-4">
                    <p className="text-[11px] text-[#ADADAD] font-medium mb-2">자격증 학습 우선순위</p>
                    {certOrder.map((certId, idx) => {
                      const cert = userCerts.find((c) => c.cert_id === certId)
                      if (!cert) return null
                      return (
                        <div key={certId} className="flex items-center justify-between py-2 border-b border-[#F5F5F3] last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#ADADAD] w-4">{idx + 1}</span>
                            <span className="text-[13px] text-[#1A1A1A]">{cert.cert_label}</span>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => moveCert(idx, 'up')} disabled={idx === 0}
                              className="w-[26px] h-[26px] flex items-center justify-center border border-[#E0E0E0] rounded-[6px] text-[#888] disabled:opacity-30 text-[12px]">↑</button>
                            <button onClick={() => moveCert(idx, 'down')} disabled={idx === certOrder.length - 1}
                              className="w-[26px] h-[26px] flex items-center justify-center border border-[#E0E0E0] rounded-[6px] text-[#888] disabled:opacity-30 text-[12px]">↓</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* B. 자격증별 과목 순서 */}
                {certOrder.length > 0 && (
                  <div className="mb-4">
                    <p className="text-[11px] text-[#ADADAD] font-medium mb-2">과목 학습 순서</p>
                    {certOrder.map((certId) => {
                      const cert = userCerts.find((c) => c.cert_id === certId)
                      const subjs = subjectOrderByCert[certId] ?? []
                      if (!cert || subjs.length === 0) return null
                      return (
                        <div key={certId} className="mb-3">
                          <p className="text-[11px] font-bold text-[#1A1A1A] mb-1">{cert.cert_label}</p>
                          {subjs.map((subj, idx) => (
                            <div key={subj} className="flex items-center justify-between py-1.5 border-b border-[#F5F5F3] last:border-0 pl-2">
                              <span className="text-[12px] text-[#1A1A1A]">{subj}</span>
                              <div className="flex gap-1">
                                <button onClick={() => moveSubject(certId, idx, 'up')} disabled={idx === 0}
                                  className="w-[26px] h-[26px] flex items-center justify-center border border-[#E0E0E0] rounded-[6px] text-[#888] disabled:opacity-30 text-[12px]">↑</button>
                                <button onClick={() => moveSubject(certId, idx, 'down')} disabled={idx === subjs.length - 1}
                                  className="w-[26px] h-[26px] flex items-center justify-center border border-[#E0E0E0] rounded-[6px] text-[#888] disabled:opacity-30 text-[12px]">↓</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                    <button onClick={handleOrderSave}
                      className="w-full py-2.5 rounded-2xl bg-[#1A1A1A] text-white text-[13px] font-bold mt-1">
                      순서 저장
                    </button>
                  </div>
                )}

                {/* B. 수강 과목 */}
                <p className="text-[11px] font-bold text-[#6B6B6B] mb-2">수강 과목</p>
                {displayCertName ? (
                  subjects.length === 0 ? (
                    <div className="py-3 text-center">
                      <p className="text-[12px] text-[#ADADAD] mb-2">아직 선택한 과목이 없어요</p>
                      <button
                        onClick={() => router.push('/select-subject')}
                        className="px-4 py-2 bg-[#00A651] text-white rounded-xl text-[12px] font-bold"
                      >
                        과목 선택하기
                      </button>
                    </div>
                  ) : showSubjectLabels ? (
                    <div className="space-y-1 mb-4">
                      {requiredInP.length > 0 && (
                        <>
                          <p className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider mb-1">필수과목</p>
                          {requiredInP.map((name, idx) => (
                            <SubjectRowP key={name} name={name} hasBorder={idx < requiredInP.length - 1 || optionalInP.length > 0} />
                          ))}
                        </>
                      )}
                      {optionalInP.length > 0 && (
                        <>
                          <p className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider mt-2 mb-1">선택과목</p>
                          {optionalInP.map((name, idx) => (
                            <SubjectRowP key={name} name={name} hasBorder={idx < optionalInP.length - 1} />
                          ))}
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 mb-4">
                      {subjects.map((name, idx) => (
                        <SubjectRowP key={name} name={name} hasBorder={idx < subjects.length - 1} />
                      ))}
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => router.push('/select-cert')}
                    className="w-full flex items-center gap-2 py-3 text-[12px] text-[#00A651] font-bold"
                  >
                    <Plus size={14} /> 자격증 추가하기
                  </button>
                )}

                {/* 학습 목표 */}
                <p className="text-[11px] font-bold text-[#6B6B6B] mb-3 mt-2">학습 목표</p>

                {/* 목표 자격증 */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#ADADAD] mb-1.5">목표 자격증</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { key: 'exercise-prescriptionist', label: '건강운동관리사' },
                      { key: 'sports-instructor-2',     label: '2급 생활스포츠지도사' },
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setCertTypeInput(label)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-bold border-2 transition-all ${
                          certTypeInput === label
                            ? 'bg-[#00A651] border-[#00A651] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 시험 연도 */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#ADADAD] mb-1.5">
                    시험 연도
                    {selectedYear && examDateInput && (
                      <span className="ml-1">({new Date(examDateInput).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 기준)</span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    {([2026, 2027, 2028] as const).map((year) => (
                      <button
                        key={year}
                        onClick={() => setExamDateInput(CERT_EXAM_DATES[year])}
                        className={`flex-1 py-2 rounded-xl text-[12px] font-bold border-2 transition-all ${
                          selectedYear === year
                            ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 지역 */}
                <div className="mb-3">
                  <label className="text-[10px] text-[#ADADAD] mb-1.5 flex items-center gap-1">
                    <MapPin size={10} /> 지역
                  </label>
                  <input
                    type="text"
                    placeholder="예: 서울, 부산, 대구..."
                    value={regionInput}
                    onChange={(e) => setRegionInput(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#00A651]"
                  />
              </div>

                {/* 저장 버튼 (자격증·목표) */}
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full py-3 bg-[#111111] text-white rounded-xl text-[13px] font-bold disabled:opacity-40"
                >
                  {savingProfile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      저장 중...
                    </span>
                  ) : '저장하기'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 4. 학습 방법 (collapsible) ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">학습 방법</p>
          <div
            className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-3 cursor-pointer"
            onClick={() => setMethodOpen(!methodOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[15px]">📖</span>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">학습 방법 설정</p>
                  <p className="text-[11px] text-[#ADADAD]">학습 방식과 알림을 설정하세요</p>
                </div>
              </div>
              <span className={`text-[#ADADAD] text-[18px] transition-transform inline-block ${methodOpen ? 'rotate-90' : ''}`}>›</span>
            </div>
            {methodOpen && (
              <div className="mt-3 pt-3 border-t border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>

                {/* 하루 공부 시간 */}
                <div className="mb-3">
                  <label className="text-[10px] text-[#ADADAD] mb-1.5 flex items-center gap-1">
                    <Clock size={10} /> 하루 공부 시간
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {['30분', '1시간', '2시간', '3시간+'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setStudyTimeInput(t)}
                        className={`py-2 rounded-xl text-[11px] font-bold border-2 transition-all ${
                          studyTimeInput === t
                            ? 'bg-[#00A651] border-[#00A651] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 하루 공부 횟수 */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#ADADAD] mb-1.5">하루 공부 횟수</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['1회', '2회', '3회+'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setStudyCountInput(c)}
                        className={`py-2 rounded-xl text-[12px] font-bold border-2 transition-all ${
                          studyCountInput === c
                            ? 'bg-[#00A651] border-[#00A651] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 주요 학습 시간대 */}
                <div className="mb-3">
                  <p className="text-[10px] text-[#ADADAD] mb-1.5">주요 학습 시간대</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { label: '오전', emoji: '🌅' },
                      { label: '오후', emoji: '☀️' },
                      { label: '저녁', emoji: '🌆' },
                      { label: '새벽', emoji: '🌙' },
                    ].map(({ label, emoji }) => (
                      <button
                        key={label}
                        onClick={() => setStudyTimeSlotInput(label)}
                        className={`py-2 rounded-xl text-[11px] font-bold border-2 transition-all flex flex-col items-center gap-0.5 ${
                          studyTimeSlotInput === label
                            ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white'
                            : 'bg-white border-[#E5E5E5] text-[#6B6B6B]'
                        }`}
                      >
                        <span className="text-[14px]">{emoji}</span>
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 학습 알리미 */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bell size={13} className="text-[#6B6B6B]" />
                    <p className="text-[12px] font-bold text-[#1A1A1A]">학습 알리미</p>
                  </div>
                  <span className="text-[10px] text-[#ADADAD]">앱 설치 후 사용 가능</span>
                </div>

                {/* 학습 방법 저장 버튼 */}
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="w-full py-3 bg-[#111111] text-white rounded-xl text-[13px] font-bold disabled:opacity-40"
                >
                  {savingProfile ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                      저장 중...
                    </span>
                  ) : '저장하기'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. 광고 ── */}
        <div className="flex flex-col items-center mt-6 mb-2 px-4">
          <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
          {tab === 'profile' && <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />}
        </div>

        {/* ── 6. 최근 학습 활동 (collapsible) ── */}
        <div>
          <p className="text-[10px] font-bold text-[#ADADAD] uppercase tracking-wider mb-1.5">최근 학습 활동</p>
          <div
            className="bg-white rounded-2xl border border-[#E5E5E5] px-4 py-3 cursor-pointer"
            onClick={() => setActivityOpen(!activityOpen)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[15px]">📋</span>
                <div>
                  <p className="text-[13px] font-bold text-[#1A1A1A]">최근 학습 활동</p>
                  <p className="text-[11px] text-[#ADADAD]">
                    {recentActivity.length > 0
                      ? `최근: ${recentActivity[0].chapter_title}`
                      : '아직 학습 기록이 없어요'}
                  </p>
                </div>
              </div>
              <span className={`text-[#ADADAD] text-[18px] transition-transform inline-block ${activityOpen ? 'rotate-90' : ''}`}>›</span>
            </div>
            {activityOpen && (
              <div className="mt-3 pt-3 border-t border-[#E5E5E5]" onClick={(e) => e.stopPropagation()}>
                {recentActivity.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 px-4">
                    <span className="text-[32px] mb-2">📚</span>
                    <p className="text-[13px] font-bold text-[#1A1A1A] mb-1">아직 학습 기록이 없어요</p>
                    <p className="text-[11px] text-[#ADADAD] text-center mb-4">강의실에서 첫 학습을 시작해 보세요!</p>
                    <button
                      onClick={() => setTab('classroom')}
                      className="px-5 py-2 bg-[#00A651] text-white rounded-xl text-[12px] font-bold"
                    >
                      학습 시작하기
                    </button>
                  </div>
                ) : (
                  recentActivity.map((item, idx) => {
                    const meta = SUBJECT_META[item.subject_name] ?? { icon: '📚', desc: '' }
                    const scoreColor = item.score >= 80 ? '#00A651' : item.score >= 60 ? '#F5A623' : '#E24B4A'
                    const dateStr = item.date
                      ? new Date(item.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                      : ''
                    return (
                      <div
                        key={item.chapter_id}
                        className={`relative flex items-center gap-3 py-3 ${idx < recentActivity.length - 1 ? 'border-b border-[#F0F0EE]' : ''} ${item.bestScore === 100 ? 'border-l-2 border-[#FFD54F] pl-2' : ''}`}
                      >
                        {item.bestScore === 100 && (
                          <div className="absolute top-2 right-0 text-[#FFD54F]">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 21h8M12 17v4M17 7A5 5 0 0 1 7 7H6a4 4 0 0 0 4 4h4a4 4 0 0 0 4-4h-1z"/>
                              <path d="M6 7H4a2 2 0 0 0 0 4h2M18 7h2a2 2 0 0 0 0-4h-2"/>
                            </svg>
                          </div>
                        )}
                        <div className="w-7 h-7 rounded-lg bg-[#F5F5F3] flex items-center justify-center text-[14px] flex-shrink-0">
                          {meta.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-[#1A1A1A] truncate">{item.chapter_title}</p>
                          <p className="text-[10px] text-[#ADADAD] truncate">{item.subject_name}{dateStr ? ` · ${dateStr}` : ''}</p>
                        </div>
                        <span className="text-[12px] font-black flex-shrink-0" style={{ color: scoreColor }}>
                          {item.score}점
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── 7. 기타 링크 ── */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          {[
            { label: '개인정보 설정',   path: '/settings/privacy', icon: '🔒' },
            { label: '개인정보처리방침', path: '/privacy',          icon: '📄' },
            { label: '이용약관',        path: '/terms',            icon: '📋' },
          ].map((item, idx, arr) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-3 text-left active:bg-[#F5F5F3] ${idx < arr.length - 1 ? 'border-b border-[#F0F0EE]' : ''}`}
            >
              <span className="text-[16px] w-6 text-center">{item.icon}</span>
              <span className="flex-1 text-[13px] text-[#1A1A1A]">{item.label}</span>
              <ChevronRight size={14} className="text-[#ADADAD]" />
            </button>
          ))}
        </div>

        {/* 로그아웃 */}
        <button
          onClick={() => setShowLogoutModal(true)}
          className="w-full py-3 text-[13px] font-semibold text-[#E24B4A]"
        >
          로그아웃
        </button>

        {/* 로그아웃 확인 모달 */}
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6">
            <div className="w-full max-w-xs bg-white rounded-2xl p-6">
              <p className="text-[16px] font-bold text-[#1A1A1A] text-center mb-6">로그아웃 하시겠습니까?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="flex-1 py-3 rounded-xl border-2 border-[#E5E5E5] text-[14px] font-semibold text-[#6B6B6B]"
                >
                  취소
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: '/trainer/dashboard' })}
                  className="flex-1 py-3 rounded-xl bg-[#E24B4A] text-white text-[14px] font-bold"
                >
                  로그아웃
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }
