'use client'

import { ChevronRight, Plus, Heart, X } from 'lucide-react'
import { KakaoAdFit } from '@/components/ads/KakaoAdFit'
import { MarqueeText } from './MarqueeText'
import { useDashboard } from './DashboardContext'
import {
  BODYBUILD_COURSES,
  BODYBUILD_SUBJECTS,
  REQUIRED_SUBJECTS,
  SUBJECT_META,
  CERT_ICONS,
} from './constants'

/* ── 과목 행 (renderClassroom 내부 SubjectRow 추출) ───────────────── */
function SubjectRow({
  name,
  hasBorder,
}: {
  name: string
  hasBorder: boolean
}) {
  const { subjectCards, subjectProgress, subjectStarStats, router } = useDashboard()

  const card     = subjectCards.find((c) => c.name === name)
  const meta     = SUBJECT_META[name] ?? { icon: '📚', desc: '' }
  const progress = subjectProgress[name]
  const pct      = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0
  return (
    <button
      onClick={() => {
        if (card?.subjectId) {
          localStorage.setItem('kinepia_current_subject_id', card.subjectId)
          router.push(`/chapters/${card.subjectId}`)
        }
      }}
      disabled={!card?.subjectId}
      className={`w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-[#F5F5F3] disabled:opacity-60 ${hasBorder ? 'border-b border-[#F0F0EE]' : ''}`}
    >
      <div className="w-9 h-9 rounded-xl bg-[#F5F5F3] flex items-center justify-center text-[18px] flex-shrink-0">
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {progress !== undefined ? (
            <>
              <div className="flex-1 h-1.5 bg-[#F0F0EE] rounded-full overflow-hidden" style={{ minWidth: 40 }}>
                <div
                  className="h-full bg-[#00A651] rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-[#ADADAD] flex-shrink-0 font-semibold">{pct}%</span>
            </>
          ) : (
            <span className="text-[10px] text-[#ADADAD]">학습 시작 전</span>
          )}
          {(() => {
            const ss = subjectStarStats[name]
            if (!ss || (ss.fire === 0 && ss.star === 0)) return null
            return (
              <div className="flex gap-1 flex-shrink-0">
                {ss.fire > 0 && (
                  <span className="bg-[#FAECE7] text-[#993C1D] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    🔥{ss.fire}
                  </span>
                )}
                {ss.star > 0 && (
                  <span className="bg-[#FAEEDA] text-[#854F0B] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                    ⭐{ss.star}
                  </span>
                )}
              </div>
            )
          })()}
        </div>
      </div>
      {card?.subjectId
        ? <ChevronRight size={14} className="text-[#ADADAD] flex-shrink-0" />
        : <span className="text-[10px] text-[#ADADAD] flex-shrink-0">준비중</span>
      }
    </button>
  )
}

// ══════════════════════════════════════════════════════════════════
// ② CLASSROOM TAB
// ══════════════════════════════════════════════════════════════════
export default function ClassroomTab() {
  const {
    certKey,
    healthCertSubjects,
    dbRequiredNames,
    subjects,
    userCerts,
    session,
    setShowLoginPrompt,
    expandedCertId,
    setExpandedCertId,
    setClassroomLoaded,
    setUserCerts,
    router,
    subjectProgress,
    subjectStarStats,
    tab,
    certLabel,
    profileCert,
    bookmarks,
  } = useDashboard()

  const fallbackRequired = certKey === 'exercise-prescriptionist'
    ? healthCertSubjects.map((s) => s.name)
    : (REQUIRED_SUBJECTS[certKey] ?? [])
  const effectiveRequired = dbRequiredNames.length > 0 ? dbRequiredNames : fallbackRequired
  const requiredList   = subjects.filter((s) => effectiveRequired.includes(s))
  const optionalList   = subjects.filter((s) => !effectiveRequired.includes(s))
  const showTypeLabels = effectiveRequired.length > 0

  return (
    <div className="overflow-y-auto p-4 pb-[130px] space-y-4" style={{ height: 'calc(100dvh - 56px)' }}>

      <div className="pt-8">
        <h2 className="text-[20px] font-black text-[#1A1A1A]">강의실</h2>
      </div>

      {userCerts.length > 0 ? (
        /* ── user_certifications 기반 다중 카드 ── */
        <>
          {userCerts
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((uc) => (
              <div key={uc.id} className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
                <div className="flex items-center pr-3 overflow-hidden">
                  <button
                    onClick={() => {
                      if (!session) { setShowLoginPrompt(true); return }
                      const newId = expandedCertId === uc.id ? null : uc.id
                      setExpandedCertId(newId)
                      if (newId !== null && newId !== expandedCertId) {
                        setClassroomLoaded(false)
                      }
                    }}
                    className="flex-1 px-4 py-4 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[20px] flex-shrink-0">
                      {CERT_ICONS[uc.cert_label] ?? '🏅'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <MarqueeText
                        text={uc.cert_label}
                        className="text-[15px] font-black text-[#1A1A1A] whitespace-nowrap"
                      />
                      <p className="text-[11px] text-[#ADADAD]">
                        {uc.cert_id === 'sports-instructor-2-practical' ? '보디빌딩' : uc.subjects.length > 0 ? `${uc.subjects.length}개 과목 수강 중` : '과목을 선택해주세요'}
                      </p>
                    </div>
                    <div className={`transition-transform duration-200 flex-shrink-0 ${expandedCertId === uc.id ? 'rotate-90' : ''}`}>
                      <ChevronRight size={16} className="text-[#ADADAD]" />
                    </div>
                  </button>
                  {/* 제거 버튼 */}
                  <button
                    onClick={async () => {
                      const userId = session?.user?.id ?? ''
                      if (!userId) return
                      try {
                        const res = await fetch('/api/v1/user-certifications', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId, certId: uc.id }),
                        })
                        if (res.ok) {
                          // 삭제 성공 시 로컬 state에서 즉시 제거 (loadClassroom은 최초 1회 이후
                          // classroomLoaded===true면 userCerts를 재조회하지 않아 반영이 안 됨)
                          setUserCerts((prev) => prev.filter((c) => c.id !== uc.id))
                        }
                        setExpandedCertId(null)
                      } catch { /* ignore */ }
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FFF0F0] flex-shrink-0"
                  >
                    <X size={14} className="text-[#E24B4A]" />
                  </button>
                </div>

                {expandedCertId === uc.id && (
                  <div className="border-t border-[#F0F0EE]">
                    {uc.cert_id === 'sports-instructor-2-practical' ? (
                      /* ── 구술/실기 보디빌딩: 고정 9개 과목 → oral-exam 이동 ── */
                      Object.entries(BODYBUILD_COURSES).map(([subjectName, _courseId], idx) => (
                        <button
                          key={subjectName}
                          onClick={() => {
                            const subjectId = BODYBUILD_SUBJECTS[subjectName] ?? ''
                            const courseId  = BODYBUILD_COURSES[subjectName]  ?? ''
                            localStorage.setItem('kinepia_current_subject_id', subjectId)
                            router.push(`/chapters/${subjectId}?courseId=${courseId}`)
                          }}
                          className={`w-full px-4 py-3.5 flex items-center gap-3 text-left active:bg-[#F5F5F3] ${idx < Object.keys(BODYBUILD_COURSES).length - 1 ? 'border-b border-[#F0F0EE]' : ''}`}
                        >
                          <div className="w-9 h-9 rounded-xl bg-[#F5F5F3] flex items-center justify-center text-[18px] flex-shrink-0">
                            {SUBJECT_META[subjectName]?.icon ?? '📚'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-[#1A1A1A] truncate">{subjectName}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {(() => {
                                const progress = subjectProgress[subjectName]
                                const pct = progress && progress.total > 0
                                  ? Math.round((progress.completed / progress.total) * 100)
                                  : 0
                                const ss = subjectStarStats[subjectName]
                                return (
                                  <>
                                    {progress !== undefined ? (
                                      <>
                                        <div className="flex-1 h-1 bg-[#F0F0EE] rounded-full overflow-hidden" style={{ minWidth: 40 }}>
                                          <div className="h-full bg-[#00A651] rounded-full" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-[10px] text-[#ADADAD] flex-shrink-0 font-semibold">{pct}%</span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-[#ADADAD]">학습 시작 전</span>
                                    )}
                                    {ss && (ss.fire > 0 || ss.star > 0) && (
                                      <div className="flex gap-1 flex-shrink-0">
                                        {ss.fire > 0 && (
                                          <span className="bg-[#FAECE7] text-[#993C1D] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                            🔥{ss.fire}
                                          </span>
                                        )}
                                        {ss.star > 0 && (
                                          <span className="bg-[#FAEEDA] text-[#854F0B] text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                                            ⭐{ss.star}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )
                              })()}
                            </div>
                          </div>
                          <ChevronRight size={14} className="text-[#ADADAD] flex-shrink-0" />
                        </button>
                      ))
                    ) : uc.subjects.length > 0 ? (
                      /* ── 일반 자격증: subjects 배열 표시 ── */
                      uc.subjects.map((name, idx) => (
                        <SubjectRow
                          key={name}
                          name={name}
                          hasBorder={idx < uc.subjects.length - 1}
                        />
                      ))
                    ) : null}
                  </div>
                )}
              </div>
            ))
          }

          <div className="flex flex-col items-center mt-6 mb-2 px-4">
            <span className="text-[9px] text-[#ADADAD] mb-1 self-start">광고</span>
            {tab === 'classroom' && <KakaoAdFit unit="DAN-LTearBRyYBpdjEd9" width={320} height={100} />}
          </div>

          {/* 강의 추가하기 버튼 (최대 3개 미만일 때만) */}
          {userCerts.length < 3 && (
            <button
              onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#E5E5E5] text-[13px] text-[#ADADAD]"
            >
              <Plus size={16} /> 강의 추가하기
            </button>
          )}
        </>
      ) : subjects.length === 0 ? (
        /* ── 빈 상태 ── */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-[56px] mb-4">📚</div>
          <p className="text-[16px] font-black text-[#1A1A1A] mb-2">학습할 자격증을 선택해주세요</p>
          <p className="text-[13px] text-[#ADADAD] mb-6">자격증과 과목을 선택하면<br />맞춤 강의가 제공됩니다</p>
          <button
            onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
            className="flex items-center gap-2 px-6 py-3.5 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
          >
            <Plus size={18} /> 강의 추가하기
          </button>
        </div>
      ) : (
        /* ── 단일 자격증 카드 + 드롭다운 (기존 fallback) ── */
        <>
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
            <button
              onClick={() => setExpandedCertId((prev) => prev === 'fallback' ? null : 'fallback')}
              className="w-full px-4 py-4 flex items-center gap-3 text-left active:bg-[#F5F5F3]"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-[20px] flex-shrink-0">
                🏅
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-[#1A1A1A] truncate">
                  {certLabel || profileCert || '내 자격증'}
                </p>
                <p className="text-[11px] text-[#ADADAD]">
                  {subjects.length}개 과목 수강 중
                </p>
              </div>
              <div className={`transition-transform duration-200 ${expandedCertId === 'fallback' ? 'rotate-90' : ''}`}>
                <ChevronRight size={16} className="text-[#ADADAD]" />
              </div>
            </button>

            {expandedCertId === 'fallback' && (
              <div className="border-t border-[#F0F0EE]">
                {showTypeLabels ? (
                  <>
                    {requiredList.length > 0 && (
                      <div>
                        <div className="px-4 py-2 bg-[#F5F5F3] flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">필수과목</span>
                          <span className="text-[10px] text-[#ADADAD]">· {requiredList.length}개</span>
                        </div>
                        {requiredList.map((name, idx) => (
                          <SubjectRow key={name} name={name} hasBorder={idx < requiredList.length - 1 || optionalList.length > 0} />
                        ))}
                      </div>
                    )}
                    {optionalList.length > 0 && (
                      <div>
                        <div className={`px-4 py-2 bg-[#F5F5F3] flex items-center gap-1.5 ${requiredList.length > 0 ? 'border-t border-[#F0F0EE]' : ''}`}>
                          <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider">선택과목</span>
                          <span className="text-[10px] text-[#ADADAD]">· {optionalList.length}개</span>
                        </div>
                        {optionalList.map((name, idx) => (
                          <SubjectRow key={name} name={name} hasBorder={idx < optionalList.length - 1} />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  subjects.map((name, idx) => (
                    <SubjectRow key={name} name={name} hasBorder={idx < subjects.length - 1} />
                  ))
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => { if (!session) { setShowLoginPrompt(true); return }; router.push('/select-cert') }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-[#E5E5E5] text-[13px] text-[#ADADAD]"
          >
            <Plus size={16} /> 강의 추가하기
          </button>
        </>
      )}

      {/* 찜한 영상 */}
      {bookmarks.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider mb-2">찜한 영상</p>
          <div className="space-y-2">
            {bookmarks.map((bm) => (
              <div key={bm.id} className="bg-white rounded-xl border border-[#E5E5E5] p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#00A651]/10 flex items-center justify-center text-[18px]">🎬</div>
                <p className="flex-1 text-[13px] font-semibold text-[#1A1A1A] truncate">{bm.video_title || '저장된 영상'}</p>
                <Heart size={15} className="text-[#E24B4A] fill-[#E24B4A] flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
