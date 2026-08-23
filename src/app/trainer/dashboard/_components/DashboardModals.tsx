'use client'

import { X, Trash2, Calendar, Plus } from 'lucide-react'
import { signIn } from 'next-auth/react'
import PhoneRegisterModal from '@/components/PhoneRegisterModal'
import { useDashboard } from './DashboardContext'
import {
  BODYBUILDING_DEMO_ACCESS_CODE_LABEL,
  BODYBUILDING_DEMO_CERT_ID,
  fmtCodeDate,
} from './constants'

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

// ══════════════════════════════════════════════════════════════════
// DASHBOARD MODALS
// ══════════════════════════════════════════════════════════════════
export default function DashboardModals() {
  const {
    router,
    showSurveyPopup, setShowSurveyPopup,
    surveyDone, surveyStep, setSurveyStep,
    surveyQ1, setSurveyQ1, surveyQ1Temp, setSurveyQ1Temp,
    setSurveyQ2, surveyQ2Temp, setSurveyQ2Temp,
    surveyFeedback, setSurveyFeedback,
    surveyText, setSurveyText,
    surveyStars, setSurveyStars,
    surveyConsent, setSurveyConsent,
    surveyLoading,
    handleSurveySubmit,
    showSubjectConfirmModal, setShowSubjectConfirmModal,
    examRound, registeredRounds, setRegisteredRounds,
    showRegisteredModal, setShowRegisteredModal,
    showExamInfoModal, setShowExamInfoModal,
    showExamNotYetModal, setShowExamNotYetModal,
    showExamClosedModal, setShowExamClosedModal,
    showOralDatePicker, setShowOralDatePicker,
    oralPickerTarget, setOralPickerTarget,
    oralPickerDate, setOralPickerDate,
    oralSubmitting, setOralSubmitting,
    oralRegs, setOralRegs,
    showOralTicket, setShowOralTicket,
    showOralTimeError, setShowOralTimeError,
    showOralNoReg, setShowOralNoReg,
    showPhoneModal, setShowPhoneModal,
    showLoginPrompt, setShowLoginPrompt,
    showCodePopup, codeInput, setCodeInput,
    codeError, setCodeError, codeSubmitting,
    handleCodeSubmit, dismissCodePopup,
    codeResult, setCodeResult,
    showDDayModal, setShowDDayModal,
    profileExamDate, profileCert,
    ddayNewCert, setDdayNewCert,
    ddayNewDate, setDdayNewDate, savingDDay,
    handleAddDDayGoal, handleClearDDay,
    showToast, toastMessage,
  } = useDashboard()

  const showBodybuildingDemoButton = Boolean(
    BODYBUILDING_DEMO_ACCESS_CODE_LABEL &&
    BODYBUILDING_DEMO_CERT_ID &&
    codeResult?.label === BODYBUILDING_DEMO_ACCESS_CODE_LABEL
  )

  return (
    <>
      {/* ── 이용 설문 팝업 ── */}
      {showSurveyPopup && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto p-6 pb-10">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />

            {surveyDone ? (
              <div className="flex flex-col items-center py-6">
                <div className="w-[52px] h-[52px] rounded-full bg-[#e8f7ef] flex items-center justify-center mb-4">
                  <span className="text-[#1a9e5c] text-[24px]">✓</span>
                </div>
                <p className="text-[16px] font-medium text-[#1A1A1A] mb-2">
                  설문에 응해주셔서 감사해요
                </p>
                <p className="text-[13px] text-[#888] text-center leading-relaxed">
                  소중한 의견이 Kinepia를<br/>더 좋게 만드는 데 도움이 됩니다.
                </p>
              </div>
            ) : (
            <>
            {/* Q1 */}
            {surveyStep === 0 && (
              <div>
                <p className="text-[16px] font-bold mb-1">학습하면서 가장 도움이 된 기능은?</p>
                <p className="text-[12px] text-[#ADADAD] mb-4">1 / 4</p>
                {['학습 슬라이드', '챕터 테스트', '오답노트', 'D-Day 플랜'].map(opt => (
                  <button key={opt}
                    onClick={() => {
                      setSurveyQ1Temp(opt)
                      setTimeout(() => {
                        setSurveyQ1(opt)
                        setSurveyStep(1)
                        setSurveyQ2Temp('')
                      }, 350)
                    }}
                    className={`w-full text-left px-4 py-3 mb-2 rounded-2xl text-[13px] font-medium transition-colors ${
                      surveyQ1Temp === opt
                        ? 'border-[1.5px] border-[#00A651] bg-[#f0fbf4]'
                        : 'border border-[#E5E5E5]'
                    }`}>
                    {opt}
                  </button>
                ))}
                <button onClick={() => setShowSurveyPopup(false)}
                  className="w-full py-2 text-[12px] text-[#ADADAD] mt-2 text-center">
                  다음에 하기
                </button>
              </div>
            )}

            {/* Q2 */}
            {surveyStep === 1 && (
              <div>
                <p className="text-[16px] font-bold mb-1">학습 콘텐츠 난이도는 어떠셨나요?</p>
                <p className="text-[12px] text-[#ADADAD] mb-4">2 / 4</p>
                {['너무 어려워요', '적당해요', '쉬워요', '모르겠어요'].map(opt => (
                  <button key={opt}
                    onClick={() => {
                      setSurveyQ2Temp(opt)
                      setTimeout(() => {
                        setSurveyQ2(opt)
                        setSurveyStep(2)
                      }, 350)
                    }}
                    className={`w-full text-left px-4 py-3 mb-2 rounded-2xl text-[13px] font-medium transition-colors ${
                      surveyQ2Temp === opt
                        ? 'border-[1.5px] border-[#00A651] bg-[#f0fbf4]'
                        : 'border border-[#E5E5E5]'
                    }`}>
                    {opt}
                  </button>
                ))}
                <button
                  onClick={() => { setSurveyQ1Temp(surveyQ1); setSurveyStep(0) }}
                  className="w-full py-2 text-[12px] text-[#ADADAD] mt-2 text-center">
                  이전
                </button>
              </div>
            )}

            {/* Q3 (step 2) 개선사항 자유 서술 */}
            {surveyStep === 2 && (
              <div>
                <p className="text-[16px] font-bold mb-1">Kinepia에 필요한 기능이나 개선사항을 자유롭게 작성해주세요</p>
                <p className="text-[12px] text-[#ADADAD] mb-3">3 / 5</p>
                <textarea
                  value={surveyFeedback}
                  onChange={e => setSurveyFeedback(e.target.value)}
                  placeholder="자유롭게 작성해주세요"
                  rows={4}
                  className="w-full border border-[#E5E5E5] rounded-2xl px-4 py-3 text-[13px] outline-none resize-none mb-3"
                />
                <button
                  onClick={() => setSurveyStep(3)}
                  className="w-full py-3 rounded-2xl bg-[#1A1A1A] text-white text-[14px] font-bold mb-2">
                  다음
                </button>
                <button onClick={() => setSurveyStep(1)}
                  className="w-full py-2 text-[12px] text-[#ADADAD]">
                  이전
                </button>
              </div>
            )}

            {/* Q4 (step 3) 별점 */}
            {surveyStep === 3 && (
              <div>
                <p className="text-[16px] font-bold mb-1">별점으로 평가해주세요</p>
                <p className="text-[12px] text-[#ADADAD] mb-4">4 / 5</p>
                <div className="flex justify-center gap-3 mb-6">
                  {[1,2,3,4,5].map(n => (
                    <button key={n}
                      onClick={() => setSurveyStars(n)}
                      className={`text-[36px] transition-transform ${n <= surveyStars ? 'opacity-100' : 'opacity-30'}`}>
                      ⭐
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => surveyStars > 0 && setSurveyStep(4)}
                  disabled={!surveyStars}
                  className="w-full py-3 rounded-2xl bg-[#1A1A1A] text-white text-[14px] font-bold disabled:opacity-40 mb-2">
                  다음
                </button>
                <button onClick={() => setSurveyStep(2)}
                  className="w-full py-2 text-[12px] text-[#ADADAD]">
                  이전
                </button>
              </div>
            )}

            {/* Q5 (step 4) 한 문장 표현 + 동의 */}
            {surveyStep === 4 && (
              <div>
                <p className="text-[16px] font-bold mb-1">Kinepia를 한 문장으로 표현해주세요</p>
                <p className="text-[12px] text-[#ADADAD] mb-3">5 / 5</p>
                <textarea
                  value={surveyText}
                  onChange={e => setSurveyText(e.target.value)}
                  placeholder="자유롭게 작성해주세요"
                  rows={3}
                  className="w-full border border-[#E5E5E5] rounded-2xl px-4 py-3 text-[13px] outline-none resize-none mb-3"
                />
                <label className="flex items-center gap-2 mb-4 cursor-pointer">
                  <input type="checkbox"
                    checked={surveyConsent}
                    onChange={e => setSurveyConsent(e.target.checked)}
                    className="w-4 h-4 accent-[#00A651]" />
                  <span className="text-[12px] text-[#ADADAD]">
                    후기를 홍보에 활용하는 것에 동의합니다
                  </span>
                </label>
                <button
                  onClick={handleSurveySubmit}
                  disabled={surveyLoading}
                  className="w-full py-3 rounded-2xl bg-[#00A651] text-white text-[14px] font-bold disabled:opacity-40 mb-2">
                  {surveyLoading ? '제출 중...' : '완료'}
                </button>
                <button onClick={() => setSurveyStep(3)}
                  className="w-full py-2 text-[12px] text-[#ADADAD]">
                  이전
                </button>
              </div>
            )}
            </>
            )}
          </div>
        </div>
      )}

      {/* ── 응시 과목 확인 모달 ── */}
      {showSubjectConfirmModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-10 max-h-[90vh] overflow-y-auto">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[18px] font-black text-[#1A1A1A]">응시 과목 확인</h2>
              <button
                onClick={() => setShowSubjectConfirmModal(false)}
                className="w-8 h-8 flex items-center justify-center text-[#ADADAD]"
              >
                <X size={20} />
              </button>
            </div>

            {/* 응시 일정 + 시험 시간 */}
            <div className="bg-[#F5F5F3] rounded-2xl px-4 py-3 mb-4 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#6B6B6B]">응시 일정</span>
                <span className="text-[13px] font-bold text-[#1A1A1A]">
                  {EXAM_DATES.find((e) => e.round === examRound)?.date} · {examRound}회차
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[#6B6B6B]">시험 시간</span>
                <span className="text-[13px] font-bold text-[#1A1A1A]">10:00 ~ 13:00 · 160분</span>
              </div>
            </div>

            <p className="text-[12px] text-[#ADADAD] mb-3">8개 과목 전체 응시 (변경 불가)</p>

            {/* 1교시 그룹 */}
            <div className="border-2 border-[#00A651]/40 rounded-2xl p-4 mb-3">
              <p className="text-[11px] font-black text-[#00A651] tracking-wider mb-2">1교시 · 80분</p>
              <div className="space-y-1.5">
                {['운동생리학', '건강체력평가', '운동처방론', '운동부하검사'].map((name, i) => (
                  <div key={name} className="flex items-center gap-3 px-3 py-2 bg-[#F5F5F3] rounded-xl">
                    <span className="text-[11px] font-bold text-[#ADADAD] w-4 flex-shrink-0">{i + 1}</span>
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2교시 그룹 */}
            <div className="border-2 border-[#00A651]/40 rounded-2xl p-4 mb-6">
              <p className="text-[11px] font-black text-[#00A651] tracking-wider mb-2">2교시 · 80분</p>
              <div className="space-y-1.5">
                {['운동상해', '기능해부학', '병태생리학', '스포츠심리학'].map((name, i) => (
                  <div key={name} className="flex items-center gap-3 px-3 py-2 bg-[#F5F5F3] rounded-xl">
                    <span className="text-[11px] font-bold text-[#ADADAD] w-4 flex-shrink-0">{i + 5}</span>
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSubjectConfirmModal(false)}
                className="py-4 border border-[#E5E5E5] text-[#6B6B6B] rounded-2xl text-[15px] font-bold"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setShowSubjectConfirmModal(false)
                  const updated = Array.from(new Set([...registeredRounds, examRound]))
                  setRegisteredRounds(updated)
                  localStorage.setItem('kinepia_registered_rounds', JSON.stringify(updated))
                  setShowRegisteredModal(true)
                }}
                className="py-4 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
              >
                확인 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 신청완료 팝업 ── */}
      {showRegisteredModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[52px] mb-3">🎉</div>
            <h2 className="text-[20px] font-black text-[#1A1A1A] mb-2">신청 완료!</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-1">
              {EXAM_DATES.find((e) => e.round === examRound)?.date} {examRound}회차
            </p>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              모의고사 신청이 완료되었습니다.<br />
              {/* TODO: 날짜 검증 추가 예정 — 현재는 언제든 입장 가능 */}
              <span className="text-[12px] text-[#00A651] font-semibold">지금 바로 입장하실 수 있습니다.</span>
            </p>
            <div className="space-y-2">
              <button
                onClick={() => { setShowRegisteredModal(false); router.push('/exam') }}
                className="w-full py-3.5 bg-[#00A651] text-white rounded-2xl text-[15px] font-bold"
              >
                입장하기
              </button>
              <button
                onClick={() => setShowRegisteredModal(false)}
                className="w-full py-3 text-[#6B6B6B] text-[14px] font-medium"
              >
                나중에 입장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 모의고사 방법 안내 모달 ── */}
      {showExamInfoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-sm bg-white rounded-t-3xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-black text-[#1A1A1A]">모의고사 형식</h2>
              <button onClick={() => setShowExamInfoModal(false)} className="w-8 h-8 flex items-center justify-center text-[#ADADAD]">✕</button>
            </div>
            <div className="space-y-3 mb-6">
              {[
                { icon: '📝', label: '총 문항',   value: '160문항 (8과목 × 20문항)' },
                { icon: '⏱️', label: '시험 시간',  value: '160분' },
                { icon: '✅', label: '합격 기준',  value: '과목별 40% 이상 + 전체 60% 이상' },
                { icon: '🗓️', label: '시험 방식',  value: '4지선다형 객관식' },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-[18px] flex-shrink-0">{icon}</span>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-[13px] text-[#6B6B6B]">{label}</span>
                    <span className="text-[13px] font-semibold text-[#1A1A1A]">{value}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowExamInfoModal(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 아직 입장 시간 아님 모달 ── */}
      {showExamNotYetModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[44px] mb-3">⏳</div>
            <h2 className="text-[17px] font-black text-[#1A1A1A] mb-2">아직 입장 시간이 아닙니다</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              입장 가능 시간은 09:50 ~ 10:01 입니다.
            </p>
            <button
              onClick={() => setShowExamNotYetModal(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 입장 마감 안내 모달 ── */}
      {showExamClosedModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[44px] mb-3">⏰</div>
            <h2 className="text-[17px] font-black text-[#1A1A1A] mb-2">입장이 마감되었습니다</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              모의고사가 시작되었습니다.<br />
              다음 일정에 참여하세요.
            </p>
            <button
              onClick={() => setShowExamClosedModal(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 구술 모의고사: 날짜 선택 바텀시트 ── */}
      {showOralDatePicker && oralPickerTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-5 pt-5 pb-10">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-5" />
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-[18px] font-black text-[#1A1A1A]">
                  {oralPickerTarget.weekNum}주차 {oralPickerTarget.slot}회차
                </h2>
                <p className="text-[13px] text-[#ADADAD] mt-1">응시할 날짜를 선택하세요</p>
              </div>
              <button
                onClick={() => { setShowOralDatePicker(false); setOralPickerDate(null); setOralPickerTarget(null) }}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-[#F5F5F3] text-[#6B6B6B] flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5">
              {['월', '화', '수', '목', '금', '토', '일'].map((d, i) => (
                <div
                  key={d}
                  className={`text-center text-[11px] font-bold ${i >= 5 ? 'text-[#E24B4A]' : 'text-[#ADADAD]'}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* 날짜 버튼 7개 */}
            <div className="grid grid-cols-7 gap-1.5 mb-5">
              {(() => {
                const usedDatesInWeek = oralRegs
                  .filter(r => r.week_number === oralPickerTarget.weekNum)
                  .map(r => r.exam_date)
                return oralPickerTarget.weekDates.map((dateStr, i) => {
                const isPast = dateStr < new Date().toISOString().split('T')[0]
                const isUsed = usedDatesInWeek.includes(dateStr)
                const isSelected = oralPickerDate === dateStr
                const isSatSun = i >= 5
                return (
                  <button
                    key={dateStr}
                    disabled={isPast || isUsed}
                    onClick={() => setOralPickerDate(dateStr)}
                    className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all ${
                      isPast || isUsed ? 'opacity-30 cursor-not-allowed' : ''
                    } ${
                      isSelected
                        ? 'bg-[#1A1A1A] text-white'
                        : isSatSun
                        ? 'bg-[#FFF0F0] text-[#E24B4A]'
                        : 'bg-[#F5F5F3] text-[#1A1A1A]'
                    }`}
                  >
                    <span className="text-[12px] font-bold">{dateStr.split('-')[2]}</span>
                  </button>
                )
              })
              })()}
            </div>

            <p className="text-[12px] font-bold text-[#E24B4A] text-center mb-4">신청 후 변경이 불가합니다</p>

            <button
              disabled={!oralPickerDate || oralSubmitting}
              onClick={() => {
                if (!oralPickerDate || !oralPickerTarget || oralSubmitting) return
                setOralSubmitting(true)
                fetch('/api/v1/oral-exam-reg', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    certificationId: 'cc68cb0c-6c32-4b14-a7d7-e422a5bc9954',
                    examDate: oralPickerDate,
                    weekNumber: oralPickerTarget.weekNum,
                    slotNumber: oralPickerTarget.slot,
                  }),
                })
                  .then((r) => r.json())
                  .then((d) => {
                    if (d.data) {
                      setOralRegs((prev) => [...prev, d.data])
                      setShowOralTicket(d.data)
                    }
                    setShowOralDatePicker(false)
                    setOralPickerDate(null)
                    setOralSubmitting(false)
                  })
              }}
              className={`w-full py-4 rounded-2xl text-[15px] font-bold transition-colors ${
                oralPickerDate && !oralSubmitting
                  ? 'bg-[#1A1A1A] text-white active:bg-[#333]'
                  : 'bg-[#F5F5F3] text-[#ADADAD]'
              }`}
            >
              {oralSubmitting ? '신청 중...' : '신청 완료'}
            </button>
          </div>
        </div>
      )}

      {/* ── 구술 모의고사: 수험표 바텀시트 ── */}
      {showOralTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl overflow-hidden">
            {/* 검정 헤더 */}
            <div className="bg-[#1A1A1A] px-5 pt-6 pb-8 text-center">
              <p className="text-[12px] font-bold text-white/50 mb-4">2급 생활스포츠지도사 구술/실기</p>
              <p className="text-[64px] font-black text-white leading-none">
                #{showOralTicket.ticket_number}
              </p>
              <p className="text-[12px] font-bold text-white/40 mt-2">수험번호</p>
            </div>

            {/* 본문 */}
            <div className="px-5 py-5 space-y-3">
              {(() => {
                const startParts = showOralTicket.start_time.split(':').map(Number)
                const endTotalMin = startParts[0] * 60 + startParts[1] + 10
                const endH = Math.floor(endTotalMin / 60)
                const endM = endTotalMin % 60
                const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
                return (
                  <>
                    {[
                      { label: '응시일',        value: showOralTicket.exam_date },
                      { label: '수험번호',       value: `#${showOralTicket.ticket_number}` },
                      { label: '배정 시간',      value: showOralTicket.start_time.slice(0, 5) },
                      { label: '입장 가능 시간', value: `${showOralTicket.start_time.slice(0, 5)} ~ ${endTimeStr}` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-center justify-between py-2 border-b border-[#F0F0EE]">
                        <span className="text-[13px] text-[#ADADAD]">{label}</span>
                        <span className="text-[13px] font-bold text-[#1A1A1A]">{value}</span>
                      </div>
                    ))}
                    <div className="mt-3 bg-[#00A651]/10 rounded-xl px-4 py-3 text-center">
                      <p className="text-[12px] font-bold text-[#00A651]">수험 시간 외 입장 불가</p>
                    </div>
                  </>
                )
              })()}
            </div>

            <div className="px-5 pb-10">
              <button
                onClick={() => setShowOralTicket(null)}
                className="w-full py-4 rounded-2xl border-2 border-[#E5E5E5] text-[15px] font-bold text-[#6B6B6B] active:bg-[#F5F5F3]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 구술 모의고사: 수험 시간 오류 팝업 ── */}
      {showOralTimeError && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[44px] mb-3">⏰</div>
            <h2 className="text-[17px] font-black text-[#1A1A1A] mb-2">수험 시간 외 입장 불가</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              배정된 수험 시간에만 입장할 수 있어요.<br />
              수험표에서 배정 시간을 확인해 주세요.
            </p>
            <button
              onClick={() => setShowOralTimeError(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── 구술 모의고사: 신청 내역 없음 팝업 ── */}
      {showOralNoReg && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            <div className="text-[44px] mb-3">📋</div>
            <h2 className="text-[17px] font-black text-[#1A1A1A] mb-2">신청 내역이 없습니다</h2>
            <p className="text-[13px] text-[#6B6B6B] leading-relaxed mb-6">
              원하는 날짜에 구술 모의고사를 신청해 보세요.
            </p>
            <button
              onClick={() => setShowOralNoReg(false)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              신청하러 가기
            </button>
          </div>
        </div>
      )}

      {/* ── 휴대폰 번호 등록 모달 ── */}
      {showPhoneModal && (
        <PhoneRegisterModal onClose={() => setShowPhoneModal(false)} />
      )}

      {/* ── 로그인 유도 바텀시트 ── */}
      {showLoginPrompt && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl px-6 pt-6 pb-10">
            <div className="w-10 h-1 bg-[#E5E5E5] rounded-full mx-auto mb-6" />
            <div className="text-center mb-6">
              <div className="text-[44px] mb-3">🔐</div>
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">로그인이 필요해요</h2>
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">무료로 시작하고 학습 기록을 저장하세요</p>
            </div>
            <button
              onClick={() => signIn('google', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 border border-[#E5E5E5] rounded-2xl text-[14px] font-medium"
            >
              <span>🔍</span> 구글로 시작하기
            </button>
            <button
              onClick={() => signIn('kakao', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-3 bg-[#FEE500] rounded-2xl text-[14px] font-medium text-[#1A1A1A]"
            >
              <span>💬</span> 카카오로 시작하기
            </button>
            {/* 네이버 로그인 */}
            <button
              onClick={() => signIn('naver', { callbackUrl: '/trainer/dashboard' })}
              className="w-full flex items-center justify-center gap-2 py-3 mb-4 bg-[#03C75A] rounded-2xl text-[14px] font-medium text-white"
            >
              <span>N</span> 네이버로 시작하기
            </button>
            <button
              onClick={() => setShowLoginPrompt(false)}
              className="w-full py-2.5 text-[13px] text-[#ADADAD] text-center"
            >
              나중에 하기
            </button>
          </div>
        </div>
      )}

      {/* ── 이용권 코드 입력 팝업 ── */}
      {showCodePopup && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6">
            <div className="text-center mb-5">
              <div className="text-[44px] mb-3">🎁</div>
              {/* ── 2026-06-15 수정: 팝업 제목 변경 ── */}
              <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">Kinepia 이용권 코드</h2>
              {/* ── 2026-06-15 수정: 하드코딩 날짜 제거 ── */}
              <p className="text-[13px] text-[#6B6B6B] leading-relaxed">
                이용 가능한 코드를 입력하세요.
              </p>
            </div>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(null) }}
              placeholder="코드를 입력하세요"
              className="w-full px-4 py-3 border-2 border-[#E5E5E5] rounded-2xl text-[15px] font-bold tracking-widest text-center mb-2 focus:outline-none focus:border-[#1A1A1A]"
              onKeyDown={(e) => e.key === 'Enter' && handleCodeSubmit()}
            />
            {codeError && (
              <p className="text-[12px] text-[#E24B4A] text-center mb-2">{codeError}</p>
            )}
            <button
              onClick={handleCodeSubmit}
              disabled={!codeInput.trim() || codeSubmitting}
              className="w-full py-3.5 bg-[#1A1A1A] disabled:bg-[#E5E5E5] disabled:text-[#ADADAD] text-white rounded-2xl text-[15px] font-bold mt-1"
            >
              {codeSubmitting ? '확인 중...' : '코드 입력하기'}
            </button>
            <button
              onClick={dismissCodePopup}
              className="w-full py-2.5 mt-2 text-[13px] text-[#ADADAD] text-center"
            >
              나중에 입력할게요
            </button>
          </div>
        </div>
      )}

      {/* ── 2026-06-24 (P0-9): 코드 입력 결과 안내 팝업 ── */}
      {codeResult && (
        <div className="fixed inset-0 bg-black/60 z-[71] flex items-center justify-center px-6">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-center">
            {codeResult.status === 'upgraded' && (
              <>
                <div className="text-[44px] mb-3">🎉</div>
                <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">코드가 변경되었습니다</h2>
                <p className="text-[13px] text-[#6B6B6B] mb-4">더 오래 이용할 수 있는 코드로 변경되었어요.</p>
                <div className="bg-[#F5F5F3] rounded-2xl p-4 text-left space-y-2 mb-5">
                  {codeResult.prevCode && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-[#ADADAD]">이전</span>
                      <span className="text-[#ADADAD] line-through">
                        {codeResult.prevCode.code}{codeResult.prevCode.expiresAt && ` · ${fmtCodeDate(codeResult.prevCode.expiresAt)}`}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#1A1A1A] font-bold">현재</span>
                    <span className="text-[#00A651] font-bold">
                      {codeResult.activeCode.code}{codeResult.activeCode.expiresAt && ` · ${fmtCodeDate(codeResult.activeCode.expiresAt)}까지`}
                    </span>
                  </div>
                </div>
              </>
            )}
            {codeResult.status === 'kept' && (
              <>
                <div className="text-[44px] mb-3">✅</div>
                <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">현재 코드가 더 유효합니다</h2>
                <p className="text-[13px] text-[#6B6B6B] mb-4">기존 코드의 이용 기간이 더 길어 그대로 유지했어요.</p>
                <div className="bg-[#F5F5F3] rounded-2xl p-4 text-left space-y-2 mb-5">
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#1A1A1A] font-bold">현재</span>
                    <span className="text-[#00A651] font-bold">
                      {codeResult.activeCode.code}{codeResult.activeCode.expiresAt && ` · ${fmtCodeDate(codeResult.activeCode.expiresAt)}까지`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-[#ADADAD]">입력</span>
                    <span className="text-[#ADADAD]">
                      {codeResult.enteredCode.code}{codeResult.enteredCode.expiresAt && ` · ${fmtCodeDate(codeResult.enteredCode.expiresAt)}`}
                    </span>
                  </div>
                </div>
              </>
            )}
            {codeResult.status === 'duplicate' && (
              <>
                <div className="text-[44px] mb-3">ℹ️</div>
                <h2 className="text-[18px] font-black text-[#1A1A1A] mb-2">이미 사용 중인 코드입니다</h2>
                <p className="text-[13px] text-[#6B6B6B] mb-5">
                  {codeResult.enteredCode.code} 코드는 이미 등록되어 있어요.
                </p>
              </>
            )}
            {showBodybuildingDemoButton && (
              <button
                onClick={() => {
                  localStorage.setItem('kinepia_selected_cert', BODYBUILDING_DEMO_CERT_ID)
                  setCodeResult(null)
                  router.push('/select-subject')
                }}
                className="w-full py-3.5 mb-2 bg-indigo-600 text-white rounded-2xl text-[15px] font-bold"
              >
                테스트 과목 보기
              </button>
            )}
            <button
              onClick={() => setCodeResult(null)}
              className="w-full py-3.5 bg-[#1A1A1A] text-white rounded-2xl text-[15px] font-bold"
            >
              확인
            </button>
          </div>
        </div>
      )}

      {/* ── D-Day 설정 모달 ── */}
      {showDDayModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 space-y-4">
            {/* 헤더 */}
            <div className="flex items-center justify-between">
              <h2 className="text-[18px] font-black text-[#1A1A1A]">D-Day 설정</h2>
              <button onClick={() => setShowDDayModal(false)} className="w-8 h-8 flex items-center justify-center text-[#ADADAD]">
                <X size={20} />
              </button>
            </div>

            {/* 현재 설정된 D-Day */}
            {profileExamDate && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">현재 D-Day</p>
                {(() => {
                  const diff = Math.ceil((new Date(profileExamDate).getTime() - Date.now()) / 86400000)
                  return (
                    <div className="flex items-center gap-3 bg-[#F5F5F3] rounded-xl px-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#1A1A1A] truncate">{profileCert || '자격증 미지정'}</p>
                        <p className="text-[11px] text-[#6B6B6B]">
                          {new Date(profileExamDate).toLocaleDateString('ko-KR')}
                          {' · '}
                          <span className="font-bold text-[#00A651]">
                            {diff > 0 ? `D-${diff}` : diff === 0 ? 'D-Day' : `D+${Math.abs(diff)}`}
                          </span>
                        </p>
                      </div>
                      <button
                        onClick={handleClearDDay}
                        className="text-[#ADADAD] hover:text-[#E24B4A]"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* D-Day 설정/변경 */}
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-[#ADADAD] uppercase tracking-wider">
                {profileExamDate ? 'D-Day 변경' : 'D-Day 설정'}
              </p>

              {/* 자격증 선택 */}
              <div className="grid grid-cols-2 gap-2">
                {['건강운동관리사', '생활스포츠지도사'].map((cert) => (
                  <button
                    key={cert}
                    onClick={() => setDdayNewCert(cert)}
                    className={`py-3 rounded-xl text-[12px] font-bold border-2 transition-all ${
                      ddayNewCert === cert
                        ? 'bg-[#00A651] border-[#00A651] text-white'
                        : 'bg-white border-[#E5E5E5] text-[#1A1A1A]'
                    }`}
                  >
                    {cert}
                  </button>
                ))}
              </div>

              {/* 날짜 선택 */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-[#6B6B6B] mb-1.5">
                  <Calendar size={12} /> 목표 시험일
                </label>
                <input
                  type="date"
                  value={ddayNewDate}
                  onChange={(e) => setDdayNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E5E5] text-[13px] text-[#1A1A1A] outline-none focus:border-[#00A651]"
                />
              </div>

              <button
                onClick={handleAddDDayGoal}
                disabled={!ddayNewDate || savingDDay}
                className="w-full py-3.5 bg-[#111111] text-white rounded-2xl text-[14px] font-bold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {savingDDay
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />저장 중...</>
                  : <><Plus size={15} /> {profileExamDate ? 'D-Day 저장' : 'D-Day 등록'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#111111] text-white
          text-[13px] font-medium px-5 py-3 rounded-2xl shadow-lg z-[100]
          whitespace-nowrap flex items-center gap-2">
          <span className="text-[#4ade80] text-[15px]">✓</span>
          {toastMessage}
        </div>
      )}
    </>
  )
}
